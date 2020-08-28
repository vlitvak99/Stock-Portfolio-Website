/**
 * @author Vlad Litvak
 * @since 08.27.2020
 */

// goes to home page if no user is logged in
if(sessionStorage.getItem("id") === null || sessionStorage.getItem("password") === null) logout();

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
 * Load the user menu and holdings information.
 * Information is gathered from api requests.
 */
function loadUserMenuAndHoldings() {
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

    // send api request to get holdings information
    fetch("user/holdings?id=" + id + "&password=" + password, {
      method: "GET"
    })
    .then(function (response) {
      // success response
      if (response.status === 200) {
        response.json().then(function(data) {
          // verify user has holdings
          if(data.holdings.length != 0 || data.totalPrincipal != 0 || data.marketValue != 0) {
            // get existing display areas
            let totalMarketValueDiv = document.getElementById("marketvalue");
            let totalPrincipalDiv = document.getElementById("principal");
            let totalChangeDiv = document.getElementById("change");

            // color the market value and total change displays based on whether it's increased
            totalMarketValueDiv.style.color = "#24A292";
            totalChangeDiv.style.color = "#24A292";
            if(data.marketValue < data.totalPrincipal) {
              totalMarketValueDiv.style.color = "#FF3200";
              totalChangeDiv.style.color = "#FF3200";
            }

            // calculate percent change
            let percentChange = (data.totalValueIncrease / data.totalPrincipal) * 100;

            // display the total market value and total principal
            totalMarketValueDiv.innerHTML = dollar.format(data.marketValue);
            totalPrincipalDiv.innerHTML = dollar.format(data.totalPrincipal);

            // display the total change
            if(percentChange < 0) totalChangeDiv.innerHTML = changeInDollars.format(data.totalValueIncrease) + " | " + percentChange.toFixed(2) + "%";
            else totalChangeDiv.innerHTML = changeInDollars.format(data.totalValueIncrease) + " | +" + percentChange.toFixed(2) + "%";

            // get holdings display area
            let holdingsDiv = document.getElementById("holdings");

            // create a div for each holding and add it to the display area
            for(var holding of data.holdings) {
              let percentChange = (holding.valueIncrease / holding.principal) * 100;

              let holdingDiv = document.createElement("div");
              holdingDiv.classList.add("listitem");

              let headerDiv = document.createElement("div");
              headerDiv.classList.add("listitemsection");

              let symbolDiv = document.createElement("a");
              symbolDiv.href = "symbol?symbol=" + holding.symbol;
              symbolDiv.style.textDecoration = "none";

              let symbol = document.createElement("div");
              symbol.classList.add("symbol");
              symbol.innerHTML = holding.symbol;

              symbolDiv.appendChild(symbol);
              headerDiv.appendChild(symbolDiv);

              let marketValueDiv = document.createElement("div");
              marketValueDiv.classList.add("marketvalue");
              if(percentChange < 0) marketValueDiv.style.color = "#FF3200";
              else marketValueDiv.style.color = "#24A292";
              marketValueDiv.innerHTML = dollar.format(holding.marketValue);
              headerDiv.appendChild(marketValueDiv);

              let clearDiv = document.createElement("div");
              clearDiv.style.clear = "both";
              headerDiv.appendChild(clearDiv);

              let symbolFullNameDiv = document.createElement("div");
              symbolFullNameDiv.classList.add("symbolfullname");
              symbolFullNameDiv.style.marginBottom = "10px";
              symbolFullNameDiv.innerHTML = holding.info.shortName;
              headerDiv.appendChild(symbolFullNameDiv);

              let changeDiv = document.createElement("div");
              changeDiv.classList.add("change");
              changeDiv.style.marginBottom = "10px";
              if(percentChange < 0) {
                changeDiv.style.color = "#FF3200";
                changeDiv.innerHTML = changeInDollars.format(holding.valueIncrease) + " | " + percentChange.toFixed(2) + "%";
              }
              else{
                changeDiv.style.color = "#24A292";
                changeDiv.innerHTML = changeInDollars.format(holding.valueIncrease) + " | +" + percentChange.toFixed(2) + "%";
              }
              headerDiv.appendChild(changeDiv);

              clearDiv = document.createElement("div");
              clearDiv.style.clear = "both";
              headerDiv.appendChild(clearDiv);

              holdingDiv.appendChild(headerDiv);

              let dayPercentChange = (((holding.info.currentPrice - holding.info.regularMarketPreviousClose) / holding.info.regularMarketPreviousClose) * 100).toFixed(2)
              let dayPriceChange = (holding.info.currentPrice - holding.info.regularMarketPreviousClose).toFixed(2)
              let color = "#24A292";
              if (dayPriceChange < 0) color = "#FF3200";

              let infoDiv = document.createElement("div");
              infoDiv.classList.add("listitemsection");

              let sharesDiv = document.createElement("div");
              sharesDiv.classList.add("leftinfo");
              sharesDiv.innerHTML = "Shares:&nbsp;&nbsp;<span style='color:white;'>" + holding.shares + "</span>";
              infoDiv.appendChild(sharesDiv);

              let currentPriceDiv = document.createElement("div");
              currentPriceDiv.classList.add("rightinfo");
              currentPriceDiv.innerHTML = "Current Price:&nbsp;&nbsp;<span style='color:" + color + ";'>" + holding.info.currentPrice.toFixed(2) + "</span>";
              infoDiv.appendChild(currentPriceDiv);

              clearDiv = document.createElement("div");
              clearDiv.style.clear = "both";
              infoDiv.appendChild(clearDiv);

              let principalDiv = document.createElement("div");
              principalDiv.classList.add("leftinfo");
              principalDiv.innerHTML = "Principal:&nbsp;&nbsp;<span style='color:white;'>" + dollar.format(holding.principal) + "</span>";
              infoDiv.appendChild(principalDiv);

              let dayGainDiv = document.createElement("div");
              dayGainDiv.classList.add("rightinfo");
              if (dayPriceChange < 0) dayGainDiv.innerHTML = "Day Gain:&nbsp;&nbsp;<span style='color:" + color + ";'>" + dayPriceChange + " | " + dayPercentChange + "%</span>";
              else dayGainDiv.innerHTML = "Day Gain:&nbsp;&nbsp;<span style='color:" + color + ";'>+" + dayPriceChange + " | +" + dayPercentChange + "%</span>";
              infoDiv.appendChild(dayGainDiv);

              clearDiv = document.createElement("div");
              clearDiv.style.clear = "both";
              infoDiv.appendChild(clearDiv);

              let avgShareCostDiv = document.createElement("div");
              avgShareCostDiv.classList.add("leftinfo");
              avgShareCostDiv.style.marginBottom = "10px";
              avgShareCostDiv.innerHTML = "Avg. Cost/Share:&nbsp;&nbsp;<span style='color:white;'>" + dollar.format(holding.avgCostPerShare) + "</span>";
              infoDiv.appendChild(avgShareCostDiv);

              let totalDayGainDiv = document.createElement("div");
              totalDayGainDiv.classList.add("rightinfo");
              totalDayGainDiv.style.marginBottom = "10px";
              totalDayGainDiv.innerHTML = "Total Day Gain:&nbsp;&nbsp;<span style='color:" + color + ";'>" + changeInDollars.format(dayPriceChange * holding.shares) + "</span>";
              infoDiv.appendChild(totalDayGainDiv);

              clearDiv = document.createElement("div");
              clearDiv.style.clear = "both";
              infoDiv.appendChild(clearDiv);

              holdingDiv.appendChild(infoDiv);

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

              let principalHeader = document.createElement("th");
              principalHeader.style.textAlign = "right";
              principalHeader.innerHTML = "Principal";
              tableHeader.appendChild(principalHeader);

              let gainHeader = document.createElement("th");
              gainHeader.style.textAlign = "right";
              gainHeader.innerHTML = "Gain";
              tableHeader.appendChild(gainHeader);

              lotsTable.appendChild(tableHeader);

              for(var lot of holding.lots) {
                let lotRow = document.createElement("tr");
                let lotLocation = "lot?lot=" + lot.lotId;
                lotRow.onclick = function () {
                  window.location.href = lotLocation;
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

                let principalValue = document.createElement("td");
                principalValue.style.textAlign = "right";
                principalValue.innerHTML = dollar.format(lot.shares * lot.buyPrice);
                lotRow.appendChild(principalValue);

                let percentGain = (((lot.valueIncrease / lot.shares) / lot.buyPrice) * 100).toFixed(2);
                let gainValue = document.createElement("td");
                gainValue.style.textAlign = "right";
                if(lot.valueIncrease < 0) {
                  gainValue.style.color = "#FF3200"
                  gainValue.innerHTML = changeInDollars.format(lot.valueIncrease) + " | " + percentGain + "%";
                }
                else {
                  gainValue.style.color = "#24A292"
                  gainValue.innerHTML = changeInDollars.format(lot.valueIncrease) + " | +" + percentGain + "%";
                }
                lotRow.appendChild(gainValue);

                lotsTable.appendChild(lotRow);

              }

              lotsDiv.appendChild(lotsTable);

              holdingDiv.appendChild(lotsDiv);

              holdingsDiv.appendChild(holdingDiv);
            }
          }
        })
      }
      // otherwise go to home page
      else window.location.href = "home";
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
