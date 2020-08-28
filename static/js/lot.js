/**
 * @author Vlad Litvak
 * @since 08.27.2020
 */

// goes to home page if no user is logged in
if(sessionStorage.getItem("id") === null || sessionStorage.getItem("password") === null) logout();

// gets lot url param
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
let lot = urlParams.get("lot");
// goes to lots page if no lot param is specified
if(lot === null) window.location.href = "lots";

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
 * Load the user menu and lot information.
 * Information is gathered from api requests.
 */
function loadUserMenuAndLot() {
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
    fetch("user/lots?id=" + id + "&password=" + password + "&lotId=" + lot, {
      method: "GET"
    })
    .then(function (response) {
      // success response
      if (response.status === 200) {
        response.json().then(function(data) {
          // create a div for the lot and add it to the display area
          let lotDiv = document.createElement("div");
          lotDiv.classList.add("listitem");

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
          titleDiv.innerHTML += "&nbsp;&nbsp;x" + (data.sharesHolding + data.sharesSold);

          headerDiv.appendChild(titleDiv);

          let editButtonDiv = document.createElement("div");
          editButtonDiv.classList.add("button");
          editButtonDiv.style.float = "right";
          editButtonDiv.style.width = "60px";
          editButtonDiv.onclick = function() {
            window.location.href = "edit-lot?lot=" + data.lotId;
          }
          editButtonDiv.innerHTML = "Edit";

          headerDiv.appendChild(editButtonDiv);

          let clearDiv = document.createElement("div");
          clearDiv.style.clear = "both";
          headerDiv.appendChild(clearDiv);

          let lotDateDiv = document.createElement("div");
          lotDateDiv.classList.add("lotdate");
          lotDateDiv.innerHTML = data.buyDate;
          headerDiv.appendChild(lotDateDiv);

          let lotPrincipalDiv = document.createElement("div");
          lotPrincipalDiv.classList.add("lotprincipal");
          lotPrincipalDiv.innerHTML = dollar.format(data.buyPrice * (data.sharesSold + data.sharesHolding));
          headerDiv.appendChild(lotPrincipalDiv);

          clearDiv = document.createElement("div");
          clearDiv.style.clear = "both";
          headerDiv.appendChild(clearDiv);

          lotDiv.appendChild(headerDiv);

          let infoDiv = document.createElement("div");
          infoDiv.classList.add("listitemsection");
          if(data.sellLots.length == 0) infoDiv.style.borderBottom = "none";

          let costDiv = document.createElement("div");
          costDiv.classList.add("leftinfo");
          costDiv.innerHTML = "Cost/Share:&nbsp;&nbsp;<span style='color:white;'>" + data.buyPrice.toFixed(2) + "</span>";
          infoDiv.appendChild(costDiv);

          let currentValueColor = "#24A292";
          if(data.buyPrice > data.currentPrice) currentValueColor = "#FF3200";
          if(data.sharesHolding == 0) currentValueColor = "white";
          let currentValueDiv = document.createElement("div");
          currentValueDiv.classList.add("rightinfo");
          currentValueDiv.innerHTML = "Current Value:&nbsp;&nbsp;<span style='color:" + currentValueColor + ";'>" + dollar.format(data.currentPrice * data.sharesHolding) + "</span>";
          infoDiv.appendChild(currentValueDiv);

          clearDiv = document.createElement("div");
          clearDiv.style.clear = "both";
          infoDiv.appendChild(clearDiv);

          let holdingDiv = document.createElement("div");
          holdingDiv.classList.add("leftinfo");
          holdingDiv.innerHTML = "Holding:&nbsp;&nbsp;<span style='color:white;'>" + data.sharesHolding + "</span>";
          infoDiv.appendChild(holdingDiv);

          let valueIncreasePercent = (0).toFixed(2);
          if(data.sharesHolding != 0) valueIncreasePercent = (((data.holdingValueIncrease / data.sharesHolding) / data.buyPrice) * 100).toFixed(2);
          let valueIncreaseColor = "white";
          if(data.holdingValueIncrease > 0) valueIncreaseColor = "#24A292";
          else if(data.holdingValueIncrease < 0) valueIncreaseColor = "#FF3200";
          let valueIncreaseDiv = document.createElement("div");
          valueIncreaseDiv.classList.add("rightinfo");
          if (data.holdingValueIncrease < 0) valueIncreaseDiv.innerHTML = "Value Increase:&nbsp;&nbsp;<span style='color:" + valueIncreaseColor + ";'>" + changeInDollars.format(data.holdingValueIncrease) + " | " + valueIncreasePercent + "%</span>";
          else valueIncreaseDiv.innerHTML = "Value Increase:&nbsp;&nbsp;<span style='color:" + valueIncreaseColor + ";'>" + changeInDollars.format(data.holdingValueIncrease) + " | +" + valueIncreasePercent + "%</span>";
          infoDiv.appendChild(valueIncreaseDiv);

          clearDiv = document.createElement("div");
          clearDiv.style.clear = "both";
          infoDiv.appendChild(clearDiv);

          let soldDiv = document.createElement("div");
          soldDiv.classList.add("leftinfo");
          soldDiv.style.marginBottom = "10px";
          soldDiv.innerHTML = "Sold:&nbsp;&nbsp;<span style='color:white;'>" + data.sharesSold + "</span>";
          infoDiv.appendChild(soldDiv);

          let profitPercent = (0).toFixed(2);
          if(data.sharesSold != 0) profitPercent = (((data.profitFromSelling / data.sharesSold) / data.buyPrice) * 100).toFixed(2);
          let profitColor = "white";
          if(data.profitFromSelling > 0) profitColor = "#24A292";
          else if(data.profitFromSelling < 0) profitColor = "#FF3200";
          let profitDiv = document.createElement("div");
          profitDiv.style.marginBottom = "10px";
          profitDiv.classList.add("rightinfo");
          if (data.profitFromSelling < 0) profitDiv.innerHTML = "Profit from Selling:&nbsp;&nbsp;<span style='color:" + profitColor + ";'>" + changeInDollars.format(data.profitFromSelling) + " | " + profitPercent + "%</span>";
          else profitDiv.innerHTML = "Profit from Selling:&nbsp;&nbsp;<span style='color:" + profitColor + ";'>" + changeInDollars.format(data.profitFromSelling) + " | +" + profitPercent + "%</span>";
          infoDiv.appendChild(profitDiv);

          clearDiv = document.createElement("div");
          clearDiv.style.clear = "both";
          infoDiv.appendChild(clearDiv);

          lotDiv.appendChild(infoDiv);

          if(data.sellLots.length != 0) {
            let sellLotsDiv = document.createElement("div");
            sellLotsDiv.classList.add("listitemsection");
            sellLotsDiv.style.border = "none";

            let sellLotsTable = document.createElement("table");
            sellLotsTable.style.marginLeft = "5px";
            sellLotsTable.style.marginRight = "5px";

            let tableHeader = document.createElement("tr");
            tableHeader.classList.add("header");

            let sellDateHeader = document.createElement("th");
            sellDateHeader.innerHTML = "Sell Date";
            tableHeader.appendChild(sellDateHeader);

            let sellPriceHeader = document.createElement("th");
            sellPriceHeader.innerHTML = "Sell Price";
            tableHeader.appendChild(sellPriceHeader);

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

            sellLotsTable.appendChild(tableHeader);

            for(var sellLot of data.sellLots) {
              let sellLotRow = document.createElement("tr");
              sellLotRow.onclick = function () {
                window.location.href = "sell-lot?sellLot=" + sellLot.sellLotId;
              };

              let sellDateValue = document.createElement("td");
              sellDateValue.innerHTML = sellLot.sellDate;
              sellLotRow.appendChild(sellDateValue);

              let sellPriceValue = document.createElement("td");
              sellPriceValue.innerHTML = sellLot.sellPrice.toFixed(2);
              sellLotRow.appendChild(sellPriceValue);

              let sharesValue = document.createElement("td");
              sharesValue.style.textAlign = "center";
              sharesValue.innerHTML = sellLot.shares;
              sellLotRow.appendChild(sharesValue);

              let profitPerSharePercent = (((sellLot.profit / sellLot.shares) / data.buyPrice) * 100).toFixed(2);
              let profitPerShareValue = document.createElement("td");
              if(sellLot.profit < 0) profitPerShareValue.style.color = "#FF3200";
              else profitPerShareValue.style.color = "#24A292";
              profitPerShareValue.style.textAlign = "right";
              if(sellLot.profit < 0) profitPerShareValue.innerHTML = changeInDollars.format(sellLot.profit / sellLot.shares) + " | " + profitPerSharePercent + "%";
              else profitPerShareValue.innerHTML = changeInDollars.format(sellLot.profit / sellLot.shares) + " | +" + profitPerSharePercent + "%";
              sellLotRow.appendChild(profitPerShareValue);

              let profitValue = document.createElement("td");
              profitValue.style.textAlign = "right";
              if(sellLot.profit < 0) profitValue.style.color = "#FF3200"
              else profitValue.style.color = "#24A292"
              profitValue.innerHTML = changeInDollars.format(sellLot.profit);
              sellLotRow.appendChild(profitValue);

              sellLotsTable.appendChild(sellLotRow);

            }

            sellLotsDiv.appendChild(sellLotsTable);

            lotDiv.appendChild(sellLotsDiv);
          }

          document.getElementById("lot").appendChild(lotDiv);
        })
      }
      // if the user does not own the lot, go to lots page
      else if(response.status === 409) window.location.href = "lots";
      // otherwise logout
      else logout();
    })
  }
  // otherwise logout
  else logout();
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
