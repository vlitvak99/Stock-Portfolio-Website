/**
 * @author Vlad Litvak
 * @since 08.14.2020
 */

// goes to home page if no user is logged in
if(sessionStorage.getItem("id") === null || sessionStorage.getItem("password") === null) logout();

// initialize changing password state to false
var changingPassword = false;

/**
 * Changes a user's password.
 * Information is gathered from the input on the webpage.
 */
function changePassword() {
  // do not change password if password is already being updated
  if(changingPassword) return;

  // record that info is being updated
  changingPassword = true;

  // get input values
  password = document.getElementById("password").value;
  newPassword = document.getElementById("new password").value;
  confirmPassword = document.getElementById("confirm password").value;

  // verify all fields are filled with valid data
  if (password == "" && newPassword == "" && confirmPassword == "") changingPassword = false;
  else if (password == "") {
    showMessage("password required", false);
    changingPassword = false;
  }
  else if (newPassword == "") {
    showMessage("new password required", false);
    changingPassword = false;
  }
  else if (confirmPassword == "") {
    showMessage("new password confirmation required", false);
    changingPassword = false;
  }
  else if (password != sessionStorage.getItem("password")) {
    showMessage("incorrect password", false);
    changingPassword = false;
  }
  else if (newPassword != confirmPassword) {
    showMessage("new passwords do not match", false);
    changingPassword = false;
  }
  else if (password == newPassword) {
    showMessage("new password cannot be the same as the current one", false);
    changingPassword = false;
  }
  else if (newPassword.length < 8) {
    showMessage("password must be at least 8 characters", false);
    changingPassword = false;
  }
  else if (newPassword.length > 50) {
    showMessage("password cannot be more than 50 characters", false);
    changingPassword = false;
  }

  // send api request to update password
  else {
    showMessage("updating...", true);
    fetch("user?id=" + sessionStorage.getItem("id")
    + "&password=" + password
    + "&newPassword=" + newPassword, {
      method: "PATCH"
    })
    .then(function (response) {
      // success response
      if (response.status === 200){
        // update the password in session storage
        sessionStorage.setItem("password", newPassword);
        // display a success message
        showMessage("update successful", true);
        // record that password is no longer being updated
        changingPassword = false;
      }
      // bad request response
      else if (response.status === 400){
        // display proper error message
        showMessage("invalid new password", false);
        // record that password is no longer being updated
        changingPassword = false;
      }
      // forbidden response
      else if (response.status === 403) {
        // display proper error message
        showMessage("incorrect password", false);
        // record that password is no longer being updated
        changingPassword = false;
      }
      else {
        // display error message
        showMessage("password not changed, please try again", false);
        // record that password is no longer being updated
        changingPassword = false;
      }
    })
  }
}

/**
 * Load the user menu.
 * Information is gathered from an api request.
 */
function loadUserMenu() {
  // get user id and password from session storage
  let id = sessionStorage.getItem("id");
  let password = sessionStorage.getItem("password");

  // send api request to get user information
  if (id !== null && password !== null) {
    fetch("user?id=" + id + "&password=" + password, {
      method: "GET"
    })
    .then(function (response) {
      // success response
      if (response.status === 200) {
        response.json().then(function(data) {
          // create a user button
          let userButton = document.createElement("div");
          userButton.setAttribute("id", "userbutton");
          userButton.classList.add("button");
          userButton.classList.add("userbutton");
          userButton.style.width = "auto";
          userButton.style.paddingLeft = "12px";
          userButton.style.paddingRight = "12px";
          userButton.onclick = function () {
            toggleMenu();
          };
          userButton.innerHTML = data.username + "&nbsp;&nbsp;&nbsp;&#9662;";
          document.getElementById("right buttons").appendChild(userButton);

          //create a menu
          let menu = document.createElement("div");
          menu.classList.add("menu");
          menu.setAttribute("id", "menu");

          let menuUserSection = document.createElement("div");
          menuUserSection.classList.add("dropdownsection");

          let menuSignedInAs = document.createElement("div");
          menuSignedInAs.style.color = "#BBBBBB";
          menuSignedInAs.style.marginLeft = "10px";
          menuSignedInAs.innerHTML = "Signed in as:";
          menuUserSection.appendChild(menuSignedInAs);

          let menuUsersName = document.createElement("div");
          menuUsersName.setAttribute("id", "name");
          menuUsersName.style.color = "white";
          menuUsersName.style.marginLeft = "10px";
          menuUsersName.style.marginTop = "10px";
          menuUsersName.innerHTML = data.firstName + " " + data.lastName;
          menuUserSection.appendChild(menuUsersName);

          menu.appendChild(menuUserSection);

          let menuPagesSection = document.createElement("div");
          menuPagesSection.classList.add("dropdownsection");

          let menuHoldings = document.createElement("div");
          menuHoldings.classList.add("dropdownclickable");
          menuHoldings.onclick = function () {
            window.location.href = "holdings";
          };
          menuHoldings.innerHTML = "Holdings";
          menuPagesSection.appendChild(menuHoldings);

          let menuLots = document.createElement("div");
          menuLots.classList.add("dropdownclickable");
          menuLots.onclick = function () {
            window.location.href = "lots";
          };
          menuLots.innerHTML = "Lots";
          menuPagesSection.appendChild(menuLots);

          let menuSells = document.createElement("div");
          menuSells.classList.add("dropdownclickable");
          menuSells.onclick = function () {
            window.location.href = "sell-lots";
          };
          menuSells.innerHTML = "Sells";
          menuPagesSection.appendChild(menuSells);

          menu.appendChild(menuPagesSection);

          let menuAccountSection = document.createElement("div");
          menuAccountSection.classList.add("dropdownsection");
          menuAccountSection.style.borderBottom = "none";

          let menuAccountSettings = document.createElement("div");
          menuAccountSettings.classList.add("dropdownclickable");
          menuAccountSettings.onclick = function () {
            window.location.href = "account-settings";
          };
          menuAccountSettings.innerHTML = "Account Settings";
          menuAccountSection.appendChild(menuAccountSettings);

          let menuLogout = document.createElement("div");
          menuLogout.classList.add("dropdownclickable");
          menuLogout.onclick = function() {
            logout();
          }
          menuLogout.innerHTML = "Log Out";
          menuAccountSection.appendChild(menuLogout);

          menu.appendChild(menuAccountSection);

          // add the menu to the page
          document.getElementById("body").appendChild(menu);
        })
      }
      // if api response is not success, logout
      else logout();
    })
  }
  // if user id or password is not in session storage, logout
  else logout();
}

/**
 * Displays a message on the page.
 *
 * @param  {string}  message The message.
 * @param  {boolean} success True if this is a success message.
 */
function showMessage(message, success) {
  // get the div in which to display the message
  let errorDiv = document.getElementById("error message");
  // set the color of the div according to whether or not the message is an error
  if (success) errorDiv.style.color = "#24A292";
  else errorDiv.style.color = "#FF3200";
  // display the message
  errorDiv.innerHTML = message;
  errorDiv.style.opacity = "100%";
}

/**
 * Hides the message on the page.
 */
function hideMessage() {
  let errorDiv = document.getElementById("error message");
  errorDiv.style.opacity = "0%";
}

/**
 * Consider pressing enter the same as clicking the change password button.
 */
document.addEventListener('keypress', changePasswordIfEnter);
function changePasswordIfEnter(e) {
  if(e.keyCode == 13) changePassword();
}

/**
 * Toggle the display of the user menu.
 */
function toggleMenu() {
  document.getElementById("menu").classList.toggle("showmenu");
}

/**
 * Hide the user menu if the screen is clicked somewhere other than the menu.
 */
window.onclick = function(e) {
  if (!e.target.matches(".userbutton")) {
  var myDropdown = document.getElementById("menu");
    if (myDropdown.classList.contains("showmenu")) {
      myDropdown.classList.remove("showmenu");
    }
  }
}

/**
 * Clear the session storage of the user's id and password,
 * then go to the home page.
 */
function logout() {
  sessionStorage.clear();
  window.location.href = "home";
}
