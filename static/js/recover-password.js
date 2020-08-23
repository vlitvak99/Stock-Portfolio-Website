/**
 * @author Vlad Litvak
 * @since 08.14.2020
 */

// clear any existing user id or password data
sessionStorage.clear();

// initialize sending reset code state to false
var sendingResetCode = false;

/**
 * Attempts to send a user a password reset code by email.
 * Information is gathered from the input on the webpage.
 */
function sendResetCode() {
  // do not send reset code if one is already being sent
  if(sendingResetCode) return;

  // record that reset code is being sent
  sendingResetCode = true;

  // get input value
  email = document.getElementById("email").value;

  // verify field is filled with valid data
  if (email == "") {
    showSendResetCodeMessage("email required", false);
    sendingResetCode = false;
  }

  // send api request to send reset code
  else {
    showSendResetCodeMessage("sending...", true);
    fetch("user/password-reset?email=" + email, {
      method: "GET"
    })
    .then(function (response) {
      // success response
      if (response.status === 200){
        // show success message
        showSendResetCodeMessage("email sent, code expires in 5 minutes", true);
        // record that reset code is no longer being sent
        sendingResetCode = false;
      }
      // forbidden response
      else if (response.status === 403) {
        response.json().then(function(data) {
          // display proper error message
          if(data.error === 1000) showSendResetCodeMessage("no user with this email", false);
          else showSendResetCodeMessage("email not sent, please try again", false);
          // record that reset code is no longer being sent
          sendingResetCode = false;
        })
      }
      else {
        // display error message
        showSendResetCodeMessage("email not sent, please try again", false);
        // record that reset code is no longer being sent
        sendingResetCode = false;
      }
    })
  }
}

// initialize resetting password state to false
var resettingPassword = false;

/**
 * Attempts to verify a password reset code.
 * Information is gathered from the input on the webpage.
 */
function resetPassword() {
  // do not reset password if it is already being reset
  if(resettingPassword) return;

  // record that password is being reset
  resettingPassword = true;

  // get input value
  username = document.getElementById("username").value;
  resetCode = document.getElementById("reset code").value;

  // verify all fields are filled with valid data
  if (username == "" && resetCode == "") {
    showResetPasswordMessage("username and reset code required");
    resettingPassword = false;
  }
  else if (username == "") {
    showResetPasswordMessage("username required");
    resettingPassword = false;
  }
  else if (resetCode == "") {
    showResetPasswordMessage("reset code required");
    resettingPassword = false;
  }

  // send api request to verify reset code
  else{
    fetch("user/password-reset/validate?username=" + username + "&resetCode=" + resetCode, {
      method: "GET"
    })
    .then(function (response) {
      // success response
      if (response.status === 200){
        response.json().then(function(data) {
          // save the user's id and reset code in session storage and go to reset password page
          sessionStorage.setItem("id", data.id);
          sessionStorage.setItem("resetCode", resetCode);
          window.location.href = "reset-password";
        })
      }
      // forbidden response
      else if (response.status === 403) {
        response.json().then(function(data) {
          // display proper error message
          if(data.error === 1000) showResetPasswordMessage("username and reset code do not match");
          else if(data.error === 1002) showResetPasswordMessage("too many attempts, try sending another reset code");
          // record that password is no longer being reset
          resettingPassword = false;
        })
      }
      else {
        // display error message
        showResetPasswordMessage("error, please try again");
        // record that password is no longer being reset
        resettingPassword = false;
      }
    })
  }
}

/**
 * Displays a message regarding the sending of a reset code on the page.
 *
 * @param  {string}  message The message.
 * @param  {boolean} success True if this is a success message.
 */
function showSendResetCodeMessage(message, success){
  let sendResetCodeErrorDiv = document.getElementById("send reset code error message");
  if (success) sendResetCodeErrorDiv.style.color = "#24A292";
  else sendResetCodeErrorDiv.style.color = "#FF3200";
  sendResetCodeErrorDiv.innerHTML = message;
  sendResetCodeErrorDiv.style.opacity = "100%";
}

/**
 * Displays a message regarding resetting the password on the page.
 *
 * @param  {string}  message The message.
 */
function showResetPasswordMessage(message){
  let resetPasswordErrorDiv = document.getElementById("reset password error message");
  resetPasswordErrorDiv.innerHTML = message;
  resetPasswordErrorDiv.style.opacity = "100%";
}

/**
 * Hides the messages on the page.
 */
function hideMessages(){
  let resetPasswordErrorDiv = document.getElementById("reset password error message");
  let sendResetCodeErrorDiv = document.getElementById("send reset code error message");
  resetPasswordErrorDiv.style.opacity = "0%";
  sendResetCodeErrorDiv.style.opacity = "0%";
}
