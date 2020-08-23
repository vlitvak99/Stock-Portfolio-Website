/**
 * @author Vlad Litvak
 * @since 08.14.2020
 */

// goes to home page if no user is logged in
if(sessionStorage.getItem("id") === null || sessionStorage.getItem("password") === null) logout();

// gets sellLot url param
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
let sellLot = urlParams.get("sellLot");
// goes to sell lots page if no sell lot param is specified
if(sellLot === null) window.location.href = "sell-lots";

// dollar formatter
var dollar = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
});

// change in dollars formatter
var changeInDollars = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  signDisplay: 'always'
});

/**
 * Load the user menu and sell lot information.
 * Information is gathered from api requests.
 */
function loadUserMenuAndSellLot() {
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

    // send api request to get lot information
    fetch("user/sell-lots?id=" + id + "&password=" + password + "&sellLotId=" + sellLot, {
      method: "GET"
    })
    .then(function (response) {
      // success response
      if (response.status === 200) {
        response.json().then(function(data) {
          // create a div for the sell lot and add it to the display area
          let sellLotDiv = document.createElement("div");
          sellLotDiv.classList.add("listitem");

          let headerDiv = document.createElement("div");
          headerDiv.classList.add("listitemsection");

          let titleDiv = document.createElement("div");
          titleDiv.classList.add("lottitle");

          let symbolDiv = document.createElement("a");
          symbolDiv.href = "symbol?symbol=" + data.symbol;
          symbolDiv.style.textDecoration = "none";

          let symbol = document.createElement("span");
          symbol.classList.add("lotsymbol");
          symbol.innerHTML = data.symbol;

          symbolDiv.appendChild(symbol);

          titleDiv.appendChild(symbolDiv);
          titleDiv.innerHTML += "&nbsp;&nbsp;x" + data.sharesSold;

          headerDiv.appendChild(titleDiv);

          let editButtonDiv = document.createElement("div");
          editButtonDiv.classList.add("button");
          editButtonDiv.style.float = "right";
          editButtonDiv.style.width = "60px";
          editButtonDiv.onclick = function() {
            window.location.href = "edit-sell-lot?sellLot=" + data.sellLotId;
          }
          editButtonDiv.innerHTML = "Edit";

          headerDiv.appendChild(editButtonDiv);

          let clearDiv = document.createElement("div");
          clearDiv.style.clear = "both";
          headerDiv.appendChild(clearDiv);

          let sellLotDateDiv = document.createElement("div");
          sellLotDateDiv.classList.add("lotdate");
          sellLotDateDiv.innerHTML = data.sellDate;
          headerDiv.appendChild(sellLotDateDiv);

          let lotWithdrawDiv = document.createElement("div");
          lotWithdrawDiv.classList.add("lotprinciple");
          lotWithdrawDiv.innerHTML = dollar.format(data.sellPrice * data.sharesSold);
          headerDiv.appendChild(lotWithdrawDiv);

          clearDiv = document.createElement("div");
          clearDiv.style.clear = "both";
          headerDiv.appendChild(clearDiv);

          sellLotDiv.appendChild(headerDiv);

          let infoDiv = document.createElement("div");
          infoDiv.classList.add("listitemsection");

          let sellPriceDiv = document.createElement("div");
          sellPriceDiv.classList.add("leftinfo");
          sellPriceDiv.style.marginBottom = "10px";
          sellPriceDiv.innerHTML = "Sell Price:&nbsp;&nbsp;<span style='color:white;'>" + data.sellPrice.toFixed(2) + "</span>";
          infoDiv.appendChild(sellPriceDiv);

          let profitColor = "#24A292";
          if(data.profit < 0) profitColor = "#FF3200";
          let profitDiv = document.createElement("div");
          profitDiv.classList.add("rightinfo");
          profitDiv.style.marginBottom = "10px";
          profitDiv.innerHTML = "Profit:&nbsp;&nbsp;<span style='color:" + profitColor + ";'>" + changeInDollars.format(data.profit) + "</span>";
          infoDiv.appendChild(profitDiv);

          clearDiv = document.createElement("div");
          clearDiv.style.clear = "both";
          infoDiv.appendChild(clearDiv);

          sellLotDiv.appendChild(infoDiv);

          let lotsDiv = document.createElement("div");
          lotsDiv.classList.add("listitemsection");
          lotsDiv.style.border = "none";

          let lotsTable = document.createElement("table");
          lotsTable.style.marginLeft = "5px";
          lotsTable.style.marginRight = "5px";

          let tableHeader = document.createElement("tr");
          tableHeader.classList.add("header");

          let buyDateHeader = document.createElement("th");
          buyDateHeader.innerHTML = "Buy Date";
          tableHeader.appendChild(buyDateHeader);

          let buyPriceHeader = document.createElement("th");
          buyPriceHeader.innerHTML = "Buy Price";
          tableHeader.appendChild(buyPriceHeader);

          let sharesHeader = document.createElement("th");
          sharesHeader.style.textAlign = "center";
          sharesHeader.innerHTML = "Shares";
          tableHeader.appendChild(sharesHeader);

          let profitPerShareHeader = document.createElement("th");
          profitPerShareHeader.style.textAlign = "right";
          profitPerShareHeader.innerHTML = "Profit/Share";
          tableHeader.appendChild(profitPerShareHeader);

          let profitHeader = document.createElement("th");
          profitHeader.style.textAlign = "right";
          profitHeader.innerHTML = "Profit";
          tableHeader.appendChild(profitHeader);

          lotsTable.appendChild(tableHeader);

          for(var lot of data.lots) {
            let lotRow = document.createElement("tr");
            lotRow.onclick = function () {
              window.location.href = "lot?lot=" + lot.lotId;
            };

            let buyDateValue = document.createElement("td");
            buyDateValue.innerHTML = lot.buyDate;
            lotRow.appendChild(buyDateValue);

            let buyPriceValue = document.createElement("td");
            buyPriceValue.innerHTML = lot.buyPrice.toFixed(2);
            lotRow.appendChild(buyPriceValue);

            let sharesValue = document.createElement("td");
            sharesValue.style.textAlign = "center";
            sharesValue.innerHTML = lot.shares;
            lotRow.appendChild(sharesValue);

            let profitPerSharePercent = (((lot.profit / lot.shares) / lot.buyPrice) * 100).toFixed(2);
            let profitPerShareValue = document.createElement("td");
            if(lot.profit < 0) profitPerShareValue.style.color = "#FF3200";
            else profitPerShareValue.style.color = "#24A292";
            profitPerShareValue.style.textAlign = "right";
            if(lot.profit < 0) profitPerShareValue.innerHTML = changeInDollars.format(lot.profit / lot.shares) + " | " + profitPerSharePercent + "%";
            else profitPerShareValue.innerHTML = changeInDollars.format(lot.profit / lot.shares) + " | +" + profitPerSharePercent + "%";
            lotRow.appendChild(profitPerShareValue);

            let profitValue = document.createElement("td");
            profitValue.style.textAlign = "right";
            if(lot.profit < 0) profitValue.style.color = "#FF3200"
            else profitValue.style.color = "#24A292"
            profitValue.innerHTML = changeInDollars.format(lot.profit);
            lotRow.appendChild(profitValue);

            lotsTable.appendChild(lotRow);

          }

          lotsDiv.appendChild(lotsTable);

          sellLotDiv.appendChild(lotsDiv);

          document.getElementById("lot").appendChild(sellLotDiv);
        })
      }
      // if the user does not own the sell lot, go to sell lots page
      else if(response.status === 409) window.location.href = "sell-lots";
      // otherwise logout
      else logout();
    })
  }
  // otherwise go to home page
  else window.location.href = "home";
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
