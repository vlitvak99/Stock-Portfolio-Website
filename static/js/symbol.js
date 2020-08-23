/**
 * @author Vlad Litvak
 * @since 08.14.2020
 */

// gets symbol url param
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
let symbol = urlParams.get("symbol");
// goes to home page if no symbol param is specified
if(symbol === null) window.location.href = "home";

/**
 * Goes to the specified symbol page.
 * Symbol is gathered from the input on the webpage.
 */
function search() {
  let searchSymbol = document.getElementById("search").value;
  if(searchSymbol != "") window.location.href = "symbol?&symbol=" + searchSymbol;
}

// initialize info loaded state to false
var infoLoaded = false;

/**
 * Load the symbol information, updates every 3 seconds.
 * Information is gathered from an api request.
 *
 * @param  {integer}  failedAttempts The amount of times in a row that this request has failed.
 */
function loadInfo(failedAttempts) {
  // update page title with symbol
  document.title = "MyShare - " + symbol.toUpperCase();

  // send api request to get symbol information
  fetch("info?symbol=" + symbol, {
    method: "GET"
  })
  .then(function (response) {
    // success response
    if (response.status === 200){
      response.json().then(function(data) {

        // calculate percent change and price change
        let percentChange = (((data.currentPrice - data.regularMarketPreviousClose) / data.regularMarketPreviousClose) * 100).toFixed(2)
        let priceChange = (data.currentPrice - data.regularMarketPreviousClose).toFixed(2)

        // display symbol
        let symbolDiv = document.getElementById("symbol");
        symbolDiv.innerHTML = data.symbol;

        // display stock price (colored based on whether it increased today)
        let stockPriceDiv = document.getElementById("stockprice");
        if(priceChange < 0) stockPriceDiv.style.color = "#FF3200";
        else stockPriceDiv.style.color = "#24A292";
        stockPriceDiv.innerHTML = data.currentPrice.toFixed(2);

        // display symbol full name
        let symbolFullNameDiv = document.getElementById("symbolfullname");
        symbolFullNameDiv.innerHTML = data.shortName;

        // display day change (colored based on whether it's increased)
        let dayChangeDiv = document.getElementById("daychange");
        if(priceChange < 0) {
          dayChangeDiv.style.color = "#FF3200";
          dayChangeDiv.innerHTML = priceChange + " | " + percentChange + "%";
        }
        else {
          dayChangeDiv.style.color = "#24A292";
          dayChangeDiv.innerHTML = "+" + percentChange + "% | +" + priceChange;
        }

        // display market open if available
        if("regularMarketOpen" in data && data.regularMarketOpen !== null) {
          let openValueDiv = document.getElementById("openvalue");
          openValueDiv.innerHTML = data.regularMarketOpen.toFixed(2);
        }

        // display day high if available
        if("regularMarketDayHigh" in data && data.regularMarketDayHigh !== null) {
          let dayHighDiv = document.getElementById("dayhigh");
          dayHighDiv.innerHTML = data.regularMarketDayHigh.toFixed(2);
        }

        // display day low if available
        if("regularMarketDayLow" in data && data.regularMarketDayLow !== null) {
          let dayLowDiv = document.getElementById("daylow");
          dayLowDiv.innerHTML = data.regularMarketDayLow.toFixed(2);
        }

        // display market close if available
        if("regularMarketPreviousClose" in data && data.regularMarketPreviousClose !== null) {
          let previousCloseDiv = document.getElementById("previousclose");
          previousCloseDiv.innerHTML = data.regularMarketPreviousClose.toFixed(2);
        }

        // display 52 week high if available
        if("fiftyTwoWeekHigh" in data && data.fiftyTwoWeekHigh !== null) {
          let fiftyTwoWeekHighDiv = document.getElementById("fiftytwoweekhigh");
          fiftyTwoWeekHighDiv.innerHTML = data.fiftyTwoWeekHigh.toFixed(2);
        }

        // display 52 week low if available
        if("fiftyTwoWeekLow" in data && data.fiftyTwoWeekLow !== null) {
          let fiftyTwoWeekLowDiv = document.getElementById("fiftytwoweeklow");
          fiftyTwoWeekLowDiv.innerHTML = data.fiftyTwoWeekLow.toFixed(2);
        }

        // display current price
        let currentPriceDiv = document.getElementById("currentprice");
        currentPriceDiv.innerHTML = data.currentPrice.toFixed(2);

        // display yield if available
        if("yield" in data && data.yield !== null) {
          let yieldDiv = document.getElementById("yield");
          yieldDiv.innerHTML = (data.yield * 100).toFixed(2) + "%";
        }

        // display volume if available
        if("regularMarketVolume" in data && data.regularMarketVolume !== null) {
          let volumeDiv = document.getElementById("volume");
          volumeDiv.innerHTML = data.regularMarketVolume;
        }

        // display business summary if available
        if("longBusinessSummary" in data && data.longBusinessSummary !== null) {
          let businessSummaryDiv = document.getElementById("businesssummary");
          businessSummaryDiv.style.borderRadius = "10px";
          businessSummaryDiv.style.padding = "1px 15px 15px 15px";
          businessSummaryDiv.style.background = "#424242";
          businessSummaryDiv.innerHTML = "<h4 style=\"color:#BBBBBB\">Business Summary</h4>" + data.longBusinessSummary;
        }

        // record that info has been loaded
        infoLoaded = true;

        // update info in 3 seconds
        setTimeout(function() { loadInfo(0) }, 3000);
      })
    }
    // bad request response
    else if(response.status === 400) {
      // request failed 5 times in a row
      if (failedAttempts > 3) {
        // if information was never loaded, display proper error message
        if(!infoLoaded){
          let symbolDiv = document.getElementById("symbol");
          symbolDiv.innerHTML = "Invalid Symbol";
        }
      }
      // otherwise, try another request in 0.5 seconds
      else setTimeout(function() { loadInfo(failedAttempts + 1) }, 500);
    }
    // internal server error response
    else if(response.status === 500) {
      // request failed 5 times in a row
      if (failedAttempts > 3) {
        if(!infoLoaded) {
          // if information was never loaded, display proper error message
          let symbolDiv = document.getElementById("symbol");
          symbolDiv.innerHTML = "Server Error";

          let symbolFullNameDiv = document.getElementById("symbolfullname");
          symbolFullNameDiv.innerHTML = "Please try again";
        }
      }
      // otherwise, try another request in 0.5 seconds
      else setTimeout(function() { loadInfo(failedAttempts + 1) }, 500);
    }
  })
}

/**
 * If no user is logged in, create log in and sign up buttons.
 * Otherwise, load the user menu.
 * Information is gathered from an api request.
 */
function loadButtons() {
  // get user id and password from session storage
  let id = sessionStorage.getItem("id");
  let password = sessionStorage.getItem("password");

  // if a user is signed in, send api request to get their information
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
      // otherwise create log in and sign up buttons
      else createDefaultButtons();
    })
  }
  // otherwise create log in and sign up buttons
  else createDefaultButtons();
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
 * Create log in and sign up buttons.
 */
function createDefaultButtons() {
  // clear any existing user id or password data
  sessionStorage.clear();
  // create a log in button
  let loginButton = document.createElement("div");
  loginButton.classList.add("button");
  loginButton.style.width = "70px";
  loginButton.onclick = function () {
    window.location.href = "login"
  };
  loginButton.innerHTML = "Log In";
  document.getElementById("right buttons").appendChild(loginButton);

  // create a sign up button
  let signUpButton = document.createElement("div");
  signUpButton.classList.add("button");
  signUpButton.style.width = "70px";
  signUpButton.onclick = function () {
    window.location.href = "register"
  };
  signUpButton.innerHTML = "Sign Up";
  document.getElementById("right buttons").appendChild(signUpButton);
  sessionStorage.clear();
}

/**
 * Clear the session storage of the user's id and password,
 * then go to the home page.
 */
function logout() {
  sessionStorage.clear();
  window.location.href = "home";
}
