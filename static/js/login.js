/**
 * @author Vlad Litvak
 * @since 08.14.2020
 */

// clear any existing user id or password data
sessionStorage.clear();

// initialize logging in state to false
var loggingIn = false;

/**
 * Attempts to log in a user.
 * Information is gathered from the input on the webpage.
 */
function login() {
  // do not login if already loggin in
  if(loggingIn) return;

  // record that login is occuring
  loggingIn = true;

  // get input values
  let username = document.getElementById("username").value;
  let password = document.getElementById("password").value;

  // verify all fields are filled with valid data
  if (username == "" && password != "") {
    showMessage("username required");
    loggingIn = false;
  }
  else if (password == "" && username != "") {
    showMessage("password required");
    loggingIn = false;
  }

  // send api request to verify login
  else if (username != "" && password != "") {
    fetch("user/id?username=" + username + "&password=" + password, {
      method: "GET"
    })
    .then(function (response) {
      // success response
      if (response.status === 200){
        response.json().then(function(data) {
          // if no user id was returned, display error message
          if(data.id === null) {
            showMessage("username and password do not match");
            // record that login is no longer occuring
            loggingIn = false;
          }
          // otherwise save the user's id and password in session storage and go to home page
          else {
            sessionStorage.setItem("id", data.id);
            sessionStorage.setItem("password", password);
            window.location.href = "home";
          }
        })
      }
      else {
        // display error message
        showMessage("login failed, please try again");
        // record that login is no longer occuring
        loggingIn = false;
      }
    })
  }
}

/**
 * Displays a message on the page.
 *
 * @param  {string}  message The message.
 */
function showMessage(message) {
  let errorDiv = document.getElementById("error message");
  errorDiv.innerHTML = message;
  errorDiv.style.opacity = "100%";
}

/**
 * Hides the message on the page.
 */
function hideMessage(){
  let errorDiv = document.getElementById("error message");
  errorDiv.style.opacity = "0%";
}

/**
 * Consider pressing enter the same as clicking the log in button.
 */
document.addEventListener('keypress', loginIfEnter);
function loginIfEnter(e) {
  if(e.keyCode == 13) login();
}
