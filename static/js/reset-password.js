/**
 * @author Vlad Litvak
 * @since 08.14.2020
 */

// goes to home page if no user is logged in
if(sessionStorage.getItem("id") === null || sessionStorage.getItem("resetCode") === null) back();

// initialize resetting password state to false
var resettingPassword = false;

/**
 * Attempts to reset a user's password.
 * Information is gathered from the input on the webpage.
 */
function resetPassword() {
  // do not reset password if it is already being reset
  if(resettingPassword) return;

  // record that password is being reset
  resettingPassword = true;

  // get input values
  let newPassword = document.getElementById("new password").value;
  let confirmPassword = document.getElementById("confirm password").value;

  // verify all fields are filled
  if (newPassword == "") {
    showMessage("password required");
    resettingPassword = false;
  }
  else if (confirmPassword == "") {
    showMessage("password confirmation required");
    resettingPassword = false;
  }
  else {
    // verify that new passwords match and are filled with valid data
    if (newPassword != confirmPassword) {
      showMessage("passwords do not match");
      // record that password is no longer being reset
      resettingPassword = false;
    }
    else if (newPassword.length < 8) {
      showMessage("password must be at least 8 characters");
      // record that password is no longer being reset
      resettingPassword = false;
    }

    // send api request to reset password
    else {
      fetch("user/password-reset?id=" + sessionStorage.getItem("id")
      + "&resetCode=" + sessionStorage.getItem("resetCode")
      + "&newPassword=" + newPassword, {
        method: "POST"
      })
      .then(function (response) {
        // success response
        if (response.status === 200) {
          response.json().then(function(data) {
            // save the user's id and password in session storage, remove the reset code, and go to home page
            sessionStorage.setItem("id", data.id);
            sessionStorage.setItem("password", newPassword);
            sessionStorage.removeItem("resetCode", data.id);
            window.location.href = "home";
          })
        }
        // forbidden response
        else if (response.status === 403) {
          // display proper error message
          showMessage("reset code expired, please send another one");
          // record that password is no longer being reset
          resettingPassword = false;
        }
        else {
          // display error message
          showMessage("password not reset, please try again");
          // record that password is no longer being reset
          resettingPassword = false;
        }
      })
    }
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
 * Consider pressing enter the same as clicking the reset password button.
 */
document.addEventListener('keypress', resetPasswordIfEnter);
function resetPasswordIfEnter(e) {
  if(e.keyCode == 13) resetPassword();
}

/**
 * Clear the session storage of the user's id and reset code,
 * then go to the recover password page.
 */
function back() {
  sessionStorage.clear();
  window.location.href = "recover-password";
}
