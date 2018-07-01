class CurrencyConverter {

    constructor() {
        this.registerServiceWorker();
        this.dbPromise = this.openDatabase();
        this.getAllCurrencies();
    }
    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
     method that registers service worker
    */
    registerServiceWorker() {
        if (!navigator.serviceWorker) return;
        navigator.serviceWorker.register('/sw.js').then(reg => {});
    } // close registerServiceWorker method
    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
     create/open an indexDB database
    */
    openDatabase() {
        if (!('indexedDB' in window)) {
            console.log('This browser doesn\'t support IndexedDB');
            return Promise.resolve();
          }
        
          return idb.open('currencyConverter', 4, function(upgradeDb) {
                switch(upgradeDb.oldVersion) {
                    case 0:
                        upgradeDb.createObjectStore('currencies');
                    case 2:
                        let store = upgradeDb.transaction.objectStore('currencies');
                        store.createIndex('id', 'id', {unique: true});
                    case 3:
                        upgradeDb.createObjectStore('currencyRates', {keyPath: 'query'});
                        let rateStore = upgradeDb.transaction.objectStore('currencyRates')
                        .createIndex('query', 'query', {unique: true});
                }
         });
    }
    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
     method that adds list of currencies to database store
    */
    cacheCurrencies(data) {
        this.dbPromise.then(db => {
            if (!db) return;
            
            let tx = db.transaction('currencies', 'readwrite'); // create a transaction 
            let store = tx.objectStore('currencies'); // access currencies the object store
            // loop through the currencies object and add them to the currencies object store
            for (const currency in data.results) {
                store.put(data.results[currency], data.results[currency].id);
            }
           // return tx.complete;

            // limit store to 160 items
            store.index('id').openCursor(null, "prev").then(cursor => {
                return cursor.advance(160);
            }).then(function deleteRest(cursor) {
                if (!cursor) return;
                cursor.delete();
                return cursor.continue().then(deleteRest);
            });
        }).then(() => {
            console.log('list of currencies added to cache (db)');
         }).catch(error => console.log('Something went wrong: '+ error));
    }
    /* +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
        Method that cache conversion rate
    */
    addCurrencyRateToCache(rate, fromCurrency, toCurrency) {
        this.dbPromise.then(db => {
            if (!db) return;
            
            let tx = db.transaction('currencyRates', 'readwrite'); // create a transaction 
            let store = tx.objectStore('currencyRates'); // access currency rate object stores

            let query = fromCurrency + '_' + toCurrency;
            // add the new entry or replace old entry with new one
            store.put({ query, rate });

            // limit store to 50 items
           store.index('query').openCursor(null, "prev").then(cursor => {
                return cursor.advance(50);
            }).then(function deleteRest(cursor) {
                if (!cursor) return;
                cursor.delete();
                return cursor.continue().then(deleteRest);
            });
        }).then(() => {
            console.log('Currency rate for ' + fromCurrency + ' and ' + toCurrency + ' added to cache');
         }).catch(error => console.log('Something went wrong: '+ error));
    }
    //+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    // get cached currency rate
    getCurrencyRateFromCache(fromCurrency, toCurrency) {
       return this.dbPromise.then(db => {
            if (!db) return;

            const query = fromCurrency + '_' + toCurrency;
            let tx = db.transaction('currencyRates', 'readwrite'); // create a transaction 
            let store = tx.objectStore('currencyRates'); // access currency rate object stores

           return store.index('query').get(query);
        }).then( RateObj => { 
                   const currencyRate  = RateObj.rate;
                    return {currencyRate, appStatus: 'Offline'}; // return the currency rate value
         }).catch(error => {
             console.log('Sorry! No rate was found in the cache:');
             this.postToHTMLPage('','','','No rate was found in the cache');
             return error;
        });
    }
    //+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    // method that gets all cached currencies and display them on select field through postToHTMLPage method.
    showCachedCurrencies() {
        return this.dbPromise.then((db) => {

            if (!db) return;
        
            let index = db.transaction('currencies')
              .objectStore('currencies').index('id');
        
            return index.getAll().then( currencies => {
                console.log('fetched currencies from cache');
                // loop through the returned currencies from cache
                for(const currency of currencies)
                {
                     // set the option to show both country and currency symbol if it ha one else show the country shortName
                     // eg United States dollar ($) 
                 let optText = '';
                    if(currency.hasOwnProperty('currencySymbol')) 
                        optText = currency.currencyName + ' (' + currency.currencySymbol + ')';
                    else    optText = currency.currencyName + '(' + currency.id + ')';

                    // call to the method that adds currency to select fields.
                    this.postToHTMLPage('currencies',currency.id, optText, 'You are offline.');
                }
            });
          });
    }
    //+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
     method that fetches the list of available currencies from the api online
    */
    getAllCurrencies() {
        fetch('https://free.currencyconverterapi.com/api/v5/currencies').then(currencies => {
            return currencies.json();
        }).then(currencies => {
            // loop through the returned currencies from 
            for (let currency in currencies.results)
            {   
                let optText = '';
                /* set the option to show both country and currency symbol if it ha one else show the country shortName
                 eg United States dollar ($) */
                if(currencies.results[currency].hasOwnProperty('currencySymbol')) 
                    optText = currencies.results[currency].currencyName + ' (' + currencies.results[currency].currencySymbol + ')';
                else    optText = currencies.results[currency].currencyName + '(' + currencies.results[currency].id + ')';

                // call to method that adds currency to select fields.
                this.postToHTMLPage('currencies',currencies.results[currency].id, optText, 'You are online');
            }
            // add the currencies to cache
            this.cacheCurrencies(currencies); // call to the method that stores returned currencies to cache.
        }).catch( error => {
            console.log('It looks like your are offline or have a bad network: ');
            this.showCachedCurrencies(); // get currencies from cache since user is offline.
        });
    }
    //++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    // Method that handles html page/ DOM communication
    postToHTMLPage(wht, currencyId, currencyNameSymbol, msg, result = 0) {
        // determin how to handle data to be displayed
        if(wht === 'currencies'){
            let fromCurSelectField = document.getElementById('from_cur'); 
            let toCurSelectField = document.getElementById('to_cur');

            let opt = document.createElement('option');
            let opt2 = document.createElement('option');

            opt.value = currencyId; // currency shortname
            opt.innerHTML =  currencyNameSymbol;

            opt2.value = currencyId; // currency shortname
            opt2.text =  currencyNameSymbol
            
            fromCurSelectField.appendChild(opt);
            toCurSelectField.appendChild(opt2);
        }
        else if(wht === 'result') { // show result after conversion
            document.getElementById('result').value = result;
        }

        if(msg !== ''){
            // show user that he is online or offline.
            document.getElementById('alert').innerHTML = msg;
        }
        return;
    }
    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
     method that calls the currency api for conversion rate.
    */
    getConversionRate(amount, fromCurrency, toCurrency) {
        fromCurrency = encodeURIComponent(fromCurrency);
        toCurrency = encodeURIComponent(toCurrency);
        let query = fromCurrency + '_' + toCurrency;

        return fetch('https://free.currencyconverterapi.com/api/v5/convert?q='+ query + '&compact=ultra').then(response => {
            return response.json();
        }).then(response => {
             /*appStatus denotes where currency rate was obtained from
            online means currency rate was obtained from api call while
            offline means it was obtained from cache*/

            const currencyRate = response[Object.keys(response)]; // get the conversion rate 
            return  {currencyRate, appStatus: 'Online'};
        }).catch(error => {
           /*appStatus denotes where currency rate was obtained from
            online means currency rate was obtained from api call while
            offline means it was obtained from cache*/

            // It looks like user is offline;
            // call the method that gets the currency rate from cache when user if offline
            const currencyRate = this.getCurrencyRateFromCache(fromCurrency, toCurrency);
            return  currencyRate;
        });
    }
} // close class
//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++




(function(){
    const converter = new CurrencyConverter(); // create an instance of CurrencyConverter class

    // add event listener to the convertion button in the index page
    document.getElementById('btnConvert').addEventListener('click', () =>{
        let msg = '';
         converter.postToHTMLPage('','','', 'conversion in progress, please wait...');
        // get form fields
        const amount = document.getElementById('amount').value;
        const fromCurrency = document.getElementById('from_cur').value;
        const toCurrency = document.getElementById('to_cur').value;
    
        // validations
        if(amount === '' || amount === 0 || isNaN(amount)) msg = 'Amount must be a number greater than 0.';
        else if(fromCurrency ==='') msg = 'Please specify the currency to convert from.';
        else if(toCurrency ==='') msg = 'Please specify the currency to convert to.';
        else if (fromCurrency === toCurrency) msg = 'Please choose a different currency to convert to.';
        else {
            // call the method that calls currency api to get conversion rate
            converter.getConversionRate(amount,fromCurrency,toCurrency).then( response =>{ 
                 const rate = response.currencyRate;
                 const appStatus = response.appStatus; // get state of user when currency rate was obtained
                if(rate !== undefined)
                {
                    const result = amount * rate; // performs currency convertion
                
                    // set conversion rate msg.
                    msg = "Conversion rate : " + rate;
                    converter.postToHTMLPage('result','','', msg, result); // call to method that handles dom communication.
                    // add conversion rate to cache if currency rate was obtained from api
                    if(appStatus ==='online')  converter.addCurrencyRateToCache(rate, fromCurrency, toCurrency); 
                }
                else converter.postToHTMLPage('','','', 'You are offline and no currency rate was found in cache');
            }).catch( error => {
                console.log('No rate was found in the cache: ');
                converter.postToHTMLPage('','','', error);
            });
        }
    
        converter.postToHTMLPage('','','', msg); // call to method that handles dom communication.  
    });


})();
/* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
     function that handles conversion
 */