/**
 * @author Vlad Litvak
 * @since 08.14.2020
 */

// goes to home page if no user is logged in
if(sessionStorage.getItem("id") === null || sessionStorage.getItem("password") === null) logout();

// initialize adding sell lot state to false
var addingSellLot = false;

/**
 * Add a sell lot.
 * Information is gathered from the input on the webpage.
 */
function addSellLot() {
  // do not add sell lot if one is already being added
  if(addingSellLot) return;

  // record that sell lot is being added
  addingSellLot = true;

  // get input values
  symbol = document.getElementById("symbol").value;
  date = document.getElementById("date").value;
  shares = document.getElementById("shares").value;
  price = document.getElementById("price").value;

  // verify all fields are filled with valid data
  if (symbol == "" && date == "" && shares == "" && cost == "") addingSellLot = false;
  else if (symbol == "") {
    showMessage("symbol required", false);
    addingSellLot = false;
  }
  else if (date == "") {
    showMessage("sell date required", false);
    addingSellLot = false;
  }
  else if (shares == "") {
    showMessage("shares required", false);
    addingSellLot = false;
  }
  else if (price == "") {
    showMessage("price required", false);
    addingSellLot = false;
  }

  // send api request to add sell lot
  else {
    // display that the sell lot is being added
    showMessage("adding...", true);
    // if a dollar sign is at the beginning of the sell price input, omit it
    if(price.charAt(0) == "$") price = price.substring(1);
    // send api request to create new sell lot
    fetch("user/sell-lots?id=" + sessionStorage.getItem("id")
    + "&password=" + sessionStorage.getItem("password")
    + "&symbol=" + symbol
    + "&sellDate=" + date
    + "&sellPrice=" + price
    + "&shares=" + shares, {
      method: "POST"
    })
    .then(function (response) {
      // success response, go to sell lots page
      if (response.status === 200) window.location.href = "sell-lots";
      // bad request response
      else if (response.status === 400){
        response.json().then(function(data) {
          // display proper error message
          if (data.error === 20009) showMessage("invalid symbol");
          else if (data.error === 20012) showMessage("must be a valid date in the format YYYY-MM-DD");
          else if (data.error === 20010) showMessage("invalid amount of shares");
          else if (data.error === 20013) showMessage("invalid price");
          else showMessage("sell lot not added, please try again", false);
          // record that sell lot is no longer being added
          addingSellLot = false;
        })
      }
      // conflict response
      else if (response.status === 409){
        response.json().then(function(data) {
          // display proper error message
          let shareDescriptor = " shares ";
          if(shares == 1) shareDescriptor = " share ";
          if (data.error === 2000) showMessage("selling " + shares + shareDescriptor + "of " + symbol.toUpperCase() + " would result in more shares being sold than bought");
          else showMessage("sell lot not added, please try again", false);
          // record that sell lot is no longer being added
          addingSellLot = false;
        })
      }
      else {
        // display error message
        showMessage("sell lot not added, please try again", false);
        // record that sell lot is no longer being added
        addingSellLot = false;
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
function showMessage(message, success){
  let errorDiv = document.getElementById("error message");
  if (success) errorDiv.style.color = "#24A292";
  else errorDiv.style.color = "#FF3200";
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
 * Consider pressing enter the same as clicking the add sell lot button.
 */
document.addEventListener('keypress', addSellLotIfEnter);
function addSellLotIfEnter(e) {
  if(e.keyCode == 13) addSellLot();
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
