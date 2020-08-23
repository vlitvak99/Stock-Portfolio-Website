/**
 * @author Vlad Litvak
 * @since 08.14.2020
 */

// goes to home page if no user is logged in
if(sessionStorage.getItem("id") === null || sessionStorage.getItem("password") === null) logout();

// initialize updating info state to false
var updatingInfo = false;

/**
 * Updates a user's account information.
 * Information is gathered from the input on the webpage.
 */
function updateInfo() {
  // do not update info if it is already being updated
  if(updatingInfo) return;

  // record that info is being updated
  updatingInfo = true;

  // get input values
  firstName = document.getElementById("first name").value;
  lastName = document.getElementById("last name").value;
  username = document.getElementById("username").value;
  email = document.getElementById("email").value;

  // verify all fields are filled with valid data
  if (firstName == "") {
    showMessage("first name required", false);
    updatingInfo = false;
  }
  else if (lastName == "") {
    showMessage("last name required", false);
    updatingInfo = false;
  }
  else if (email == "") {
    showMessage("email required", false);
    updatingInfo = false;
  }
  else if (username == "") {
    showMessage("username required", false);
    updatingInfo = false;
  }
  else if (firstName.length > 25) {
    showMessage("first name cannot be more than 25 characters", false);
    updatingInfo = false;
  }
  else if (lastName.length > 25) {
    showMessage("last name cannot be more than 25 characters", false);
    updatingInfo = false;
  }
  else if (email.length > 100) {
    showMessage("email cannot be more than 100 characters", false);
    updatingInfo = false;
  }
  else if (username.length < 6) {
    showMessage("username must be at least 6 characters", false);
    updatingInfo = false;
  }
  else if (username.length > 25) {
    showMessage("username cannot be more than 25 characters" , false);
    updatingInfo = false;
  }

  // send api request to update account information
  else {
    showMessage("updating...", true);
    fetch("user?id=" + sessionStorage.getItem("id")
    + "&password=" + sessionStorage.getItem("password")
    + "&firstName=" + firstName
    + "&lastName=" + lastName
    + "&username=" + username
    + "&email=" + email, {
      method: "PATCH"
    })
    .then(function (response) {
      // success response
      if (response.status === 200){
        response.json().then(function(data) {
          // update page with new information
          document.getElementById("first name").value = data.firstName;
          document.getElementById("last name").value = data.lastName;
          document.getElementById("username").value = data.username;
          document.getElementById("email").value = data.email;
          document.getElementById("userbutton").innerHTML = data.username + "&nbsp;&nbsp;&nbsp;&#9662;";
          document.getElementById("name").innerHTML = data.firstName + " " + data.lastName;
          showMessage("update successful", true);
          // record that info is no longer being updated
          updatingInfo = false;
        })
      }
      // bad request response
      else if (response.status === 400){
        response.json().then(function(data) {
          // display proper error message
          if (data.error === 20005) showMessage("username can only contain letters, numbers, periods, & underscores");
          else if (data.error === 20007) showMessage("first name can only contain letters, periods, & spaces");
          else if (data.error === 20008) showMessage("last name can only contain letters, periods, & spaces");
          else if (data.error === 20006) showMessage("invalid email");
          else showMessage("information not updated, please try again", false);
          //record that info is no longer being updated
          updatingInfo = false;
        })
      }
      // forbidden response
      else if (response.status === 403) {
        response.json().then(function(data) {
          // display proper error message
          if(data.error === 30005) showMessage("username is already taken", false);
          else if(data.error === 30006) showMessage("email is already taken", false);
          else showMessage("information not updated, please try again", false);
          // record that info is no longer being updated
          updatingInfo = false;
        })
      }
      else {
        // display error message
        showMessage("information not updated, please try again", false);
        // record that info is no longer being updated
        updatingInfo = false;
      }
    })
  }
}

/**
 * Load the user menu and account information.
 * Information is gathered from an api request.
 */
function loadUserMenuAndInfo() {
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

          // fill inputs with current information
          document.getElementById("first name").value = data.firstName;
          document.getElementById("last name").value = data.lastName;
          document.getElementById("username").value = data.username;
          document.getElementById("email").value = data.email;
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
 * Consider pressing enter the same as clicking the update information button.
 */
document.addEventListener('keypress', updateInfoIfEnter);
function updateInfoIfEnter(e) {
  if(e.keyCode == 13) updateInfo();
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
