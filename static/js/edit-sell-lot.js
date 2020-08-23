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
// goes to lots page if no sell lot param is specified
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

// initialize updating sell lot state to false
var updatingSellLot = false;

/**
 * Updates a sell lot's information.
 * Information is gathered from the input on the webpage.
 */
function updateSellLot() {
  // do not update sell lot if lot is already being updated
  if(updatingSellLot) return;

  // record that sell lot is being updated
  updatingSellLot = true;

  // get input values
  date = document.getElementById("date").value;
  shares = document.getElementById("shares").value;
  price = document.getElementById("price").value;

  // verify all fields are filled with valid data
  if (date == "") {
    showMessage("sell date required", false);
    updatingSellLot = false;
  }
  else if (shares == "") {
    showMessage("shares required", false);
    updatingSellLot = false;
  }
  else if (price == "") {
    showMessage("sell price required", false);
    updatingSellLot = false;
  }

  // send api request to update sell lot information
  else {
    // display that the sell lot is being updated
    showMessage("updating...", true);
    // if a dollar sign is at the beginning of the sell price input, omit it
    if(price.charAt(0) == "$") price = price.substring(1);
    // send api request to update sell lot
    fetch("user/sell-lots?id=" + sessionStorage.getItem("id")
    + "&password=" + sessionStorage.getItem("password")
    + "&sellLotId=" + sellLot
    + "&sellDate=" + date
    + "&sellPrice=" + price
    + "&shares=" + shares, {
      method: "PATCH"
    })
    .then(function (response) {
      // success response, go to sell lot page
      if (response.status === 200) window.location.href = "sell-lot?sellLot=" + sellLot;
      // bad request response
      else if (response.status === 400){
        response.json().then(function(data) {
          // display proper error message
          if (data.error === 20014) showMessage("must be a valid date in the format YYYY-MM-DD");
          else if (data.error === 20010) showMessage("invalid amount of shares");
          else if (data.error === 20013) showMessage("invalid sell price");
          else showMessage("sell lot not updated, please try again", false);
          // record that sell lot is no longer being updated
          updatingSellLot = false;
        })
      }
      // conflict response
      else if (response.status === 409){
        response.json().then(function(data) {
          // display proper error message
          if (data.error === 2000) showMessage("selling " + shares + " shares in this lot would result in more shares being sold than bought");
          else showMessage("sell lot not updated, please try again", false);
          // record that sell lot is no longer being updated
          updatingSellLot = false;
        })
      }
      else {
        // display error message
        showMessage("sell lot not updated, please try again", false);
        // record that sell lot is no longer being updated
        updatingSellLot = false;
      }
    })
  }
}

/**
 * Load the user menu and sell lot information.
 * Information is gathered from api requests.
 */
function loadUserMenuAndSellLotInfo() {
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
      // otherwise logout
      else logout();
    })

    // send api request to get sell lot information
    fetch("user/sell-lots?id=" + id
    + "&password=" + password
    + "&sellLotId=" + sellLot, {
      method: "GET"
    })
    .then(function (response) {
      // success response
      if (response.status === 200) {
        response.json().then(function(data) {
          // fill inputs with current information
          document.getElementById("symbol").innerHTML = data.symbol;
          document.getElementById("date").value = data.sellDate;
          document.getElementById("shares").value = data.sharesSold;
          document.getElementById("price").value = data.sellPrice;
        })
      }
      // otherwise go to sell lots page
      else window.location.href = "sell-lots";
    })
  }
  // otherwise go to home page
  else window.location.href = "home";
}

/**
 * Goes to delete sell lot page.
 */
function deleteSellLot() {
  window.location.href = "delete-sell-lot?sellLot=" + sellLot;
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
 * Consider pressing enter the same as clicking the update sell lot button.
 */
document.addEventListener('keypress', updateSellLotIfEnter);
function updateSellLotIfEnter(e) {
  if(e.keyCode == 13) updateSellLot();
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
