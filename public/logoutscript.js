document.addEventListener("DOMContentLoaded", function(){
    const logoutButton = document.getElementById("logout-button");
    logoutButton.addEventListener("click", function(){
        fetch("/logout", {
            method: "GET",
        })
            .then((response) => response.text())
            .then(() => {
                // Redirect to the login page or any other desired page
                window.location.href = "/"; 
            })
            .catch((error) => {
                console.error("Logout failed:", error);
            });
    })
})