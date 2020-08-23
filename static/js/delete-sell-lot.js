/**
 * @author Vlad Litvak
 * @since 08.14.2020
 */

// goes to home page if no user is logged in
if(sessionStorage.getItem("id") === null || sessionStorage.getItem("password") === null) logout();

// gets sellLot url param
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
var sellLot = urlParams.get("sellLot");
// goes to sell lots page if no sell lot param is specified
if(sellLot === null) window.location.href = "sell-lots";

// verifies that the logged in user owns this sell lot through api call
fetch("user/sell-lots?id=" + sessionStorage.getItem("id")
+ "&password=" + sessionStorage.getItem("password")
+ "&sellLotId=" + sellLot, {
  method: "GET"
})
.then(function (response) {
  // if response is not success, go to sell lots page
  if (response.status !== 200) window.location.href = "sell-lots";
})

// initialize deleting sell lot state to false
var deletingSellLot = false;

/**
 * Deletes the sell lot.
 */
function deleteSellLot() {
  // do not delete sell lot if sell lot is already being deleted
  if(deletingSellLot) return;

  // record that sell lot is being deleted
  deletingSellLot = true;

  // display that the sell lot is being deleted
  showMessage("deleting...", true);
  // send api request to delete sell lot
  fetch("user/sell-lots?id=" + sessionStorage.getItem("id")
  + "&password=" + sessionStorage.getItem("password")
  + "&sellLotId=" + sellLot, {
    method: "DELETE"
  })
  .then(function (response) {
    // success response , go to sell lots page
    if (response.status === 200) window.location.href = "sell-lots";
    else {
      // display error message
      showMessage("sell lot deletion failed, please try again", false);
      // record that sell lot is no longer being deleted
      deletingSellLot = false;
    }
  })
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
function hideMessage(){
  let errorDiv = document.getElementById("error message");
  errorDiv.style.opacity = "0%";
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
