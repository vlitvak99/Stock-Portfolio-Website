/**
 * @author Vlad Litvak
 * @since 08.14.2020
 */

 // initialize registering user state to false
 var registeringUser = false;

 /**
  * Attempts to register a user.
  * Information is gathered from the input on the webpage.
  */
function register() {
  // do not register user if one is already being registered
  if(registeringUser) return;

  // record that user is being registered
  registeringUser = true;

  // get input values
  let firstName = document.getElementById("first name").value;
  let lastName = document.getElementById("last name").value;
  let email = document.getElementById("email").value;
  let username = document.getElementById("username").value;
  let password = document.getElementById("password").value;
  let confirmPassword = document.getElementById("confirm password").value;

  // verify all fields are filled with valid data
  if (firstName == "" && lastName == "" && email == "" && username == "" && password == "" && confirmPassword == "") registeringUser = false;
  else if (firstName == "") {
    showMessage("first name required");
    registeringUser = false;
  }
  else if (lastName == "") {
    showMessage("last name required");
    registeringUser = false;
  }
  else if (email == "") {
    showMessage("email required");
    registeringUser = false;
  }
  else if (username == "") {
    showMessage("username required");
    registeringUser = false;
  }
  else if (password == "") {
    showMessage("password required");
    registeringUser = false;
  }
  else if (confirmPassword == "") {
    showMessage("password confirmation required");
    registeringUser = false;
  }
  else if (firstName.length > 25) {
    showMessage("first name cannot be more than 25 characters");
    registeringUser = false;
  }
  else if (lastName.length > 25) {
    showMessage("last name cannot be more than 25 characters");
    registeringUser = false;
  }
  else if (email.length > 100) {
    showMessage("email cannot be more than 100 characters");
    registeringUser = false;
  }
  else if (username.length < 6) {
    showMessage("username must be at least 6 characters");
    registeringUser = false;
  }
  else if (username.length > 25) {
    showMessage("username cannot be more than 25 characters");
    registeringUser = false;
  }
  else if (password != confirmPassword) {
    showMessage("passwords do not match");
    registeringUser = false;
  }
  else if (password.length < 8) {
    showMessage("password must be at least 8 characters");
    registeringUser = false;
  }
  else if (password.length > 50) {
    showMessage("password cannot be more than 50 characters");
    registeringUser = false;
  }

  // send api request to register  user
  else {
    fetch("user?username=" + username
    + "&password=" + password
    + "&email=" + email
    + "&firstName=" + firstName
    + "&lastName=" + lastName, {
      method: "POST"
    })
    .then(function (response) {
      // success response
      if (response.status === 200){
        response.json().then(function(data) {
          // save the user's id and password in session storage and go to home page
          sessionStorage.setItem("id", data.id);
          sessionStorage.setItem("password", password);
          window.location.href = "home";
        })
      }
      // forbidden response
      else if (response.status === 403){
        response.json().then(function(data) {
          // display proper error message
          if (data.error === 30005) showMessage("username already taken");
          else if (data.error === 30006) showMessage("email already taken");
          else showMessage("user not created, please try again");
          // record that user is no longer being registered
          registeringUser = false;
        })
      }
      // bad request response
      else if (response.status === 400){
        response.json().then(function(data) {
          // display proper error message
          if (data.error === 20005) showMessage("username can only contain letters, numbers, periods, & underscores");
          else if (data.error === 20002) showMessage("invalid password");
          else if (data.error === 20007) showMessage("first name can only contain letters, periods, & spaces");
          else if (data.error === 20008) showMessage("last name can only contain letters, periods, & spaces");
          else if (data.error === 20006) showMessage("invalid email");
          else showMessage("user not created, please try again");
          // record that user is no longer being registered
          registeringUser = false;
        })
      }
      else {
        // display error message
        showMessage("user not created, please try again");
        // record that user is no longer being registered
        registeringUser = false;
      }
    })
  }
}

/**
 * Displays a message regarding resetting the password on the page.
 *
 * @param  {string}  message The message.
 */
function showMessage(message){
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
 * Consider pressing enter the same as clicking the create account button.
 */
document.addEventListener('keypress', registerIfEnter);
function registerIfEnter(e) {
  if(e.keyCode == 13) register();
}
