/**
 * @author Vlad Litvak
 * @since 08.14.2020
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
 * Load the user menu and lots information.
 * Information is gathered from api requests.
 */
function loadUserMenuAndLots() {
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

    // send api request to get lots information
    fetch("user/lots?id=" + id + "&password=" + password, {
      method: "GET"
    })
    .then(function (response) {
      // success response
      if (response.status === 200) {
        response.json().then(function(data) {
          // verify user has lots
          if(data.lots.length != 0 || data.currentPrinciple != 0 || data.totalValueIncrease != 0 || data.totalProfitFromSelling != 0) {
            // get existing display areas
            let currentPrincipleDiv = document.getElementById("principle");
            let valueIncreaseDiv = document.getElementById("valueincrease");
            let profitFromSellingDiv = document.getElementById("profit");

            // color the total value increase display based on whether it's increased
            if(data.totalValueIncrease < 0) valueIncreaseDiv.style.color = "#FF3200";
            else valueIncreaseDiv.style.color = "#24A292";

            // color the total profit from selling displays based on whether it's increased
            if(data.totalProfitFromSelling < 0) profitFromSellingDiv.style.color = "#FF3200";
            else profitFromSellingDiv.style.color = "#24A292";

            // display the current principle, total value increase, and total profit from selling
            currentPrincipleDiv.innerHTML = dollar.format(data.currentPrinciple);
            valueIncreaseDiv.innerHTML = changeInDollars.format(data.totalValueIncrease);
            profitFromSellingDiv.innerHTML = changeInDollars.format(data.totalProfitFromSelling);

            // create a div for each lot and add it to the display area
            let lotsDiv = document.getElementById("lots");
            for(var lot of data.lots) {

              let lotDiv = document.createElement("div");
              lotDiv.classList.add("listitem");

              let headerDiv = document.createElement("div");
              headerDiv.classList.add("listitemsection");

              let titleDiv = document.createElement("div");
              titleDiv.classList.add("lottitle");

              let symbolDiv = document.createElement("a");
              symbolDiv.href = "symbol?symbol=" + lot.symbol;
              symbolDiv.style.textDecoration = "none";

              let symbol = document.createElement("span");
              symbol.classList.add("lotsymbol");
              symbol.innerHTML = lot.symbol;

              symbolDiv.appendChild(symbol);
              titleDiv.appendChild(symbolDiv);
              titleDiv.innerHTML += "&nbsp;&nbsp;x" + (lot.sharesHolding + lot.sharesSold);

              headerDiv.appendChild(titleDiv);

              let buttonsDiv = document.createElement("div");
              buttonsDiv.style.float = "right";

              let viewButtonDiv = document.createElement("div");
              viewButtonDiv.classList.add("button");
              viewButtonDiv.style.float = "left";
              viewButtonDiv.style.width = "60px";
              let viewLocation = "lot?lot=" + lot.lotId;
              viewButtonDiv.onclick = function() {
                window.location.href = viewLocation;
              }
              viewButtonDiv.innerHTML = "View";
              buttonsDiv.appendChild(viewButtonDiv);

              let editButtonDiv = document.createElement("div");
              editButtonDiv.classList.add("button");
              editButtonDiv.style.float = "right";
              editButtonDiv.style.width = "60px";
              let editLocation = "edit-lot?lot=" + lot.lotId;
              editButtonDiv.onclick = function() {
                window.location.href = editLocation;
              }
              editButtonDiv.innerHTML = "Edit";
              buttonsDiv.appendChild(editButtonDiv);

              headerDiv.appendChild(buttonsDiv);

              let clearDiv = document.createElement("div");
              clearDiv.style.clear = "both";
              headerDiv.appendChild(clearDiv);

              let lotDateDiv = document.createElement("div");
              lotDateDiv.classList.add("lotdate");
              lotDateDiv.innerHTML = lot.buyDate;
              headerDiv.appendChild(lotDateDiv);

              let lotPrincipleDiv = document.createElement("div");
              lotPrincipleDiv.classList.add("lotprinciple");
              lotPrincipleDiv.innerHTML = dollar.format(lot.buyPrice * (lot.sharesSold + lot.sharesHolding));
              headerDiv.appendChild(lotPrincipleDiv);

              clearDiv = document.createElement("div");
              clearDiv.style.clear = "both";
              headerDiv.appendChild(clearDiv);

              lotDiv.appendChild(headerDiv);

              let infoDiv = document.createElement("div");
              infoDiv.classList.add("listitemsection");
              if(lot.sellLots.length == 0) infoDiv.style.borderBottom = "none";

              let costDiv = document.createElement("div");
              costDiv.classList.add("leftinfo");
              costDiv.innerHTML = "Cost/Share:&nbsp;&nbsp;<span style='color:white;'>" + lot.buyPrice.toFixed(2) + "</span>";
              infoDiv.appendChild(costDiv);

              let currentValueColor = "#24A292";
              if(lot.buyPrice > lot.currentPrice) currentValueColor = "#FF3200";
              if(lot.sharesHolding == 0) currentValueColor = "white";
              let currentValueDiv = document.createElement("div");
              currentValueDiv.classList.add("rightinfo");
              currentValueDiv.innerHTML = "Current Value:&nbsp;&nbsp;<span style='color:" + currentValueColor + ";'>" + dollar.format(lot.currentPrice * lot.sharesHolding) + "</span>";
              infoDiv.appendChild(currentValueDiv);

              clearDiv = document.createElement("div");
              clearDiv.style.clear = "both";
              infoDiv.appendChild(clearDiv);

              let holdingDiv = document.createElement("div");
              holdingDiv.classList.add("leftinfo");
              holdingDiv.innerHTML = "Holding:&nbsp;&nbsp;<span style='color:white;'>" + lot.sharesHolding + "</span>";
              infoDiv.appendChild(holdingDiv);

              let valueIncreasePercent = (0).toFixed(2);
              if(lot.sharesHolding != 0) valueIncreasePercent = (((lot.holdingValueIncrease / lot.sharesHolding) / lot.buyPrice) * 100).toFixed(2);
              let valueIncreaseColor = "white";
              if(lot.holdingValueIncrease > 0) valueIncreaseColor = "#24A292";
              else if(lot.holdingValueIncrease < 0) valueIncreaseColor = "#FF3200";
              let valueIncreaseDiv = document.createElement("div");
              valueIncreaseDiv.classList.add("rightinfo");
              if (lot.holdingValueIncrease < 0) valueIncreaseDiv.innerHTML = "Value Increase:&nbsp;&nbsp;<span style='color:" + valueIncreaseColor + ";'>" + changeInDollars.format(lot.holdingValueIncrease) + " | " + valueIncreasePercent + "%</span>";
              else valueIncreaseDiv.innerHTML = "Value Increase:&nbsp;&nbsp;<span style='color:" + valueIncreaseColor + ";'>" + changeInDollars.format(lot.holdingValueIncrease) + " | +" + valueIncreasePercent + "%</span>";
              infoDiv.appendChild(valueIncreaseDiv);

              clearDiv = document.createElement("div");
              clearDiv.style.clear = "both";
              infoDiv.appendChild(clearDiv);

              let soldDiv = document.createElement("div");
              soldDiv.classList.add("leftinfo");
              soldDiv.style.marginBottom = "10px";
              soldDiv.innerHTML = "Sold:&nbsp;&nbsp;<span style='color:white;'>" + lot.sharesSold + "</span>";
              infoDiv.appendChild(soldDiv);

              let profitPercent = (0).toFixed(2);
              if(lot.sharesSold != 0) profitPercent = (((lot.profitFromSelling / lot.sharesSold) / lot.buyPrice) * 100).toFixed(2);
              let profitColor = "white";
              if(lot.profitFromSelling > 0) profitColor = "#24A292";
              else if(lot.profitFromSelling < 0) profitColor = "#FF3200";
              let profitDiv = document.createElement("div");
              profitDiv.style.marginBottom = "10px";
              profitDiv.classList.add("rightinfo");
              if (lot.profitFromSelling < 0) profitDiv.innerHTML = "Profit from Selling:&nbsp;&nbsp;<span style='color:" + profitColor + ";'>" + changeInDollars.format(lot.profitFromSelling) + " | " + profitPercent + "%</span>";
              else profitDiv.innerHTML = "Profit from Selling:&nbsp;&nbsp;<span style='color:" + profitColor + ";'>" + changeInDollars.format(lot.profitFromSelling) + " | +" + profitPercent + "%</span>";
              infoDiv.appendChild(profitDiv);

              clearDiv = document.createElement("div");
              clearDiv.style.clear = "both";
              infoDiv.appendChild(clearDiv);

              lotDiv.appendChild(infoDiv);

              if(lot.sellLots.length != 0) {
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

                for(var sellLot of lot.sellLots) {
                  let sellLotRow = document.createElement("tr");
                  let sellLotLocation = "sell-lot?sellLot=" + sellLot.sellLotId;
                  sellLotRow.onclick = function () {
                    window.location.href = sellLotLocation;
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

                  let profitPerSharePercent = (((sellLot.profit / sellLot.shares) / lot.buyPrice) * 100).toFixed(2);
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

              lotsDiv.appendChild(lotDiv);
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
