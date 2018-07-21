//this is used to reveal the dropdown content

function myFunction(){
    document.getElementById('myDropdown').classList.toggle("show");
}
/*close the dropdown menu if the user clicks outside the box*/
window.onclick = function(event){
    if(!event.target.matches('.dropbtn')){
        let dropdowns = document.getElementsByClassName('dropdown-content');
        var i;
        for (i = 0; i < dropdowns.length; i++){
            let openDropdown = dropdowns[i];
            if(openDropdown.classList.contains('show')){
                openDropdown.classList.remove('show');
            }
        }
    }
}      
