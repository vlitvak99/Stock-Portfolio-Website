# --------------------------------------------------------------------------
# Hosts an API for the MyShare Stock Market and Portfolio Management Service
# Hosts all MyShare webpages
#
# Author: Vlad Litvak
# Email: vlitvak99@gmail.com
# Version: 4.2.7
# Since: 08.14.2020
# --------------------------------------------------------------------------

from flask import Flask, Response, render_template
from flask_restful import Api, Resource, reqparse
from passlib.hash import sha256_crypt
from yahoo_fin import stock_info
import yfinance
import secrets
import sqlite3
import re
import json
import yagmail

ADMIN_EMAIL_ADDRESS = ""
ADMIN_EMAIL_PASSWORD = ""

SQLITE_DATABASE = "database/MyShare.db"

MAX_USER_ID = 1000000000000
MAX_ID = 1000000000000000

HTTP_OK = 200
HTTP_BAD_REQUEST = 400
HTTP_FORBIDDEN = 403
HTTP_CONFLICT = 409
HTTP_INTERNAL_SERVER_ERROR = 500

AUTHENTICATION_FAILED = 1000
OWNERSHIP_AUTHENTICATION_FAILED = 1001
TOO_MANY_AUTHENTICATION_ATTEMPTS = 1002

BOUGHT_SOLD_DISCREPANCY = 2000

MISSING_REQUIRED_PARAMS = 10000
MISSING_ID_PARAM = 10001
MISSING_PASSWORD_PARAM = 10002
MISSING_NEW_PASSWORD_PARAM = 10003
MISSING_RESET_CODE_PARAM = 10004
MISSING_USERNAME_PARAM = 10005
MISSING_EMAIL_PARAM = 10006
MISSING_FIRST_NAME_PARAM = 10007
MISSING_LAST_NAME_PARAM = 10008
MISSING_SYMBOL_PARAM = 10009
MISSING_SHARES_PARAM = 10010
MISSING_BUY_PRICE_PARAM = 10011
MISSING_BUY_DATE_PARAM = 10012
MISSING_SELL_PRICE_PARAM = 10013
MISSING_SELL_DATE_PARAM = 10014
MISSING_LOT_ID_PARAM = 10015
MISSING_SELL_LOT_ID_PARAM = 10016

INVALID_PASSWORD_PARAM = 20002
INVALID_NEW_PASSWORD_PARAM = 20003
INVALID_USERNAME_PARAM = 20005
INVALID_EMAIL_PARAM = 20006
INVALID_FIRST_NAME_PARAM = 20007
INVALID_LAST_NAME_PARAM = 20008
INVALID_SYMBOL_PARAM = 20009
INVALID_SHARES_PARAM = 20010
INVALID_BUY_PRICE_PARAM = 20011
INVALID_BUY_DATE_PARAM = 20012
INVALID_SELL_PRICE_PARAM = 20013
INVALID_SELL_DATE_PARAM = 20014

USERNAME_ALREADY_TAKEN = 30005
EMAIL_ALREADY_TAKEN = 30006

# email must be in valid format (xxx@xxx.xxx) and can't be longer than 100 characters
emailRegex = '^(?=.{1,100}$)[a-z0-9]+[\._]?[a-z0-9]+[@]\w+[.]\w{2,3}$'
def checkEmailFormat(email):
    return re.search(emailRegex, email)

# username can only contain letters, numbers, periods and underscores and must be 6-25 characters long
usernameRegex = '^(?=.{6,25}$)[a-zA-Z0-9._]+$'
def checkUsernameFormat(username):
    return re.search(usernameRegex, username)

# password must be between 8 and 50 characters
def checkPasswordFormat(password):
	return len(password) >= 8 and len(password) <= 50

# name can't be longer than 25 characters and can only contain letters, periods, and spaces
nameRegex = '^(?=.{1,25}$)[a-zA-Z.( )]+$'
def checkNameFormat(name):
    return re.search(nameRegex, name)

# must be a positive integer or a positive float with exactly one or two digits after the decimal
dollarRegex = '^\d+\.\d\d$|^\d+\.\d$|^\d+$'
def checkDollarFormat(dollar):
    return re.search(dollarRegex, dollar)

# must be a valid date in the format YYYY-MM-DD
dateRegex = '^\d\d\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$'
def checkDateFormat(date):
    return re.search(dateRegex, date)

# must be a positive integer
intRegex = '^\d+$'
def checkIntFormat(integer):
    return re.search(intRegex, integer)

# must be 1 to 5 letters
symbolRegex = '^(?=.{1,5}$)[a-zA-Z]+$'
def checkSymbolFormat(symbol):
    return re.search(symbolRegex, symbol)

def executeDatabaseQuery(query):
	connection = sqlite3.connect(SQLITE_DATABASE)
	cursor = connection.cursor()
	results = cursor.execute(query).fetchall()
	connection.commit()
	connection.close()
	return results

def executeDatabaseUpdate(statement):
	connection = sqlite3.connect(SQLITE_DATABASE)
	cursor = connection.cursor()
	cursor.execute("PRAGMA foreign_keys = ON;")
	cursor.execute(statement)
	connection.commit()
	connection.close()
	return cursor

def usernameAvailable(username):
	if not checkUsernameFormat(username):
		return False
	query = "SELECT COUNT(*) FROM Users WHERE Username = '{}';".format(username)
	result = executeDatabaseQuery(query)
	return result[0][0] == 0

def userOwnsUsername(id, username):
	query = "SELECT COUNT(*) FROM Users WHERE ID = {} AND Username = '{}';".format(id, username);
	result = executeDatabaseQuery(query)
	return result[0][0] != 0

def emailAvailable(email):
	if not checkEmailFormat(email):
		return False
	query = "SELECT COUNT(*) FROM Users WHERE Email = '{}';".format(email)
	result = executeDatabaseQuery(query)
	return result[0][0] == 0

def userOwnsEmail(id, email):
	query = "SELECT COUNT(*) FROM Users WHERE ID = {} AND Email = '{}';".format(id, email);
	result = executeDatabaseQuery(query)
	return result[0][0] != 0

def matchIdAndPassword(id, password):
	if not checkIntFormat(id):
		return False
	query = "SELECT Password FROM Users WHERE ID = '{}';".format(id)
	result = executeDatabaseQuery(query)
	if result == []:
		return False
	return sha256_crypt.verify(password, result[0][0])

def symbolHeldByUser(symbol, userId):
	if not symbolExists(symbol):
		return False
	query = "SELECT COUNT(*) FROM Holdings WHERE User = {} AND Symbol = '{}' AND SellLotID IS NULL;".format(userId, symbol)
	result = executeDatabaseQuery(query)
	return result[0][0] != 0

def lotOwnedByUser(lotId, userId):
	if not checkIntFormat(lotId) or not checkIntFormat(userId):
		return False
	query = "SELECT COUNT(*) FROM Holdings WHERE LotID = {} AND User = {};".format(lotId, userId)
	result = executeDatabaseQuery(query)
	return result[0][0] != 0

def lotHeldByUser(lotId, userId):
	if not checkIntFormat(lotId) or not checkIntFormat(userId):
		return False
	query = "SELECT COUNT(*) FROM Holdings WHERE LotID = {} AND User = {} AND SellLotID IS NULL;".format(lotId, userId)
	result = executeDatabaseQuery(query)
	return result[0][0] != 0

def lotSoldByUser(sellLotId, userId):
	if not checkIntFormat(sellLotId) or not checkIntFormat(userId):
		return False
	query = "SELECT COUNT(*) FROM Holdings WHERE SellLotID = {} AND User = {};".format(sellLotId, userId)
	result = executeDatabaseQuery(query)
	return result[0][0] != 0

def shareHeldByUser(shareId, userId):
	if not checkIntFormat(shareId) or not checkIntFormat(userId):
		return False
	query = "SELECT COUNT(*) FROM Holdings WHERE ShareId = {} AND User = {} AND SellLotID IS NULL;".format(shareId, userId)
	result = executeDatabaseQuery(query)
	return result[0][0] != 0

def shareSoldByUser(shareId, userId):
	if not checkIntFormat(shareId) or not checkIntFormat(userId):
		return False
	query = "SELECT COUNT(*) FROM Holdings WHERE ShareID = {} AND User = {} AND SellLotID IS NOT NULL;".format(shareId, userId)
	result = executeDatabaseQuery(query)
	return result[0][0] != 0

def symbolExists(symbol):
	if not checkSymbolFormat(symbol):
		return False
	try:
		price = stock_info.get_live_price(symbol)
		info = yfinance.Ticker(symbol)
		info.info.update({ "currentPrice" : price })
	except:
		return False
	return True

def createUserId():
	while True:
		id = secrets.randbelow(MAX_USER_ID)
		query = "SELECT COUNT(*) FROM Users WHERE ID = {};".format(id)
		result = executeDatabaseQuery(query)
		if result[0][0] == 0:
			return id

def createShareId():
	while True:
		id = secrets.randbelow(MAX_ID)
		query = "SELECT COUNT(*) FROM Holdings WHERE ID = {};".format(id)
		result = executeDatabaseQuery(query)
		if result[0][0] == 0:
			return id

def createShareIds(numberOfShares):
	shareIds = []
	for i in range(numberOfShares):
		ShareIdUnique = False
		while not ShareIdUnique:
			shareId = secrets.randbelow(MAX_ID)
			query = "SELECT COUNT(*) FROM Holdings WHERE ShareID = {};".format(shareId)
			result = executeDatabaseQuery(query)
			if result[0][0] == 0 and shareId not in shareIds:
				shareIds.append(shareId)
				ShareIdUnique = True
	return shareIds

def createLotId():
	while True:
		id = secrets.randbelow(MAX_ID)
		query = "SELECT COUNT(*) FROM Holdings WHERE LotID = {};".format(id)
		result = executeDatabaseQuery(query)
		if result[0][0] == 0:
			return id

def createSellLotId():
	while True:
		id = secrets.randbelow(MAX_ID)
		query = "SELECT COUNT(*) FROM Holdings WHERE SellLotID = {};".format(id)
		result = executeDatabaseQuery(query)
		if result[0][0] == 0:
			return id

def createPasswordResetEmail(firstName, username, resetCode):
	return """
			<!DOCTYPE html>
			<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
			<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Poppins">
			<body style="background-color:#191919;font-size:16px;font-family:'Poppins', 'Helvetica Neue', sans-serif;">
				<div style="background-color:#464646;background:linear-gradient(0deg, #232323 0%, #5A5A5A 100%);Margin:0px auto;max-width:600px;">
					<div style="color:#24A292;font-size:25px;width:40%;margin-left:30%;">
						<a href="http://localhost:1817/myshare/home" style="text-decoration:none;">
							<div style="width:100%;background-color: #353535;background: linear-gradient(0deg, #1D1D1D 0%, #353535 100%);color:#24A292;font-size:25px;text-align:center;padding-top:10px;padding-bottom:10px;border:2px solid #24A292;border-radius:10px;cursor:pointer;">MyShare</div>
						</a>
					</div>
					<div style="width:90%;margin-left:5%;border-bottom:2px solid #24A292;">
						<div style="color:#C4C4C4;width:90%;margin-left:5%;margin-bottom:15px;font-size:18px;font-weight:bolder;">Hi {},</div>
						<div style="color:#FFFDFD;width:90%;margin-left:5%;">You have requested to reset your MyShare password. If this was not you, please ignore this email.</div>
					</div>
					<div style="width:90%;margin-left:5%;border-bottom:2px solid #24A292;">
						<div style="color:#FFFDFD;width:90%;margin-left:5%;margin-bottom:5px;">Here is the information you will need to reset your password:</div>
						<div style="color:#C4C4C4;width:90%;margin-left:5%;">Username: <span style="color:#FFFDFD;font-weight:bolder;">{}</span><br><span>Password Reset Code: </span><span style="font-weight:bolder;color:#FF3200">{}</span></div>
					</div>
					<div style="width:36%;margin-left:32%;">
						<a href="http://localhost:1817/myshare/recover-password" style="text-decoration:none;">
							<div style="width:100%;margin-bottom:10px;padding-top:10px;padding-bottom:10px;background-color:#24A292;background:linear-gradient(90deg, #24A292 0%, #247da2 100%);color:#FFFDFD;border-radius:45px;text-align:center;cursor:pointer;">Reset Password</div>
						</a>
					</div>
				</div>
			</body>
			</html>
			""".format(firstName, username, resetCode)



# /myshare/info
class Info(Resource):

	# get general information of a symbol including current price, previous close, name, business summary, etc.
	#
	# param : "symbol" the symbol whose info will be returned (required)
	def get(self):
		parser = reqparse.RequestParser()
		parser.add_argument("symbol")
		params = parser.parse_args()

		if params["symbol"] is None:
			return Response(json.dumps({ "error" : MISSING_SYMBOL_PARAM, "message" : "'symbol' parameter required" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		try:
			price = round(stock_info.get_live_price(params["symbol"]), 2)
			info = yfinance.Ticker(params["symbol"])
			info.info.update({ "currentPrice" : price })
			return Response(json.dumps(info.info), status=HTTP_OK, mimetype="application/json")
		except:
			return Response(json.dumps({ "error" : INVALID_SYMBOL_PARAM, "message" : "Invalid symbol" }), status=HTTP_BAD_REQUEST, mimetype="application/json")


# /myshare/info/price
class Price(Resource):

	# get current price a symbol
	#
	# param : "symbol" the symbol whose price will be returned (required)
	def get(self):
		parser = reqparse.RequestParser()
		parser.add_argument("symbol")
		params = parser.parse_args()

		if params["symbol"] is None:
			return Response(json.dumps({ "error" : MISSING_SYMBOL_PARAM, "message" : "'symbol' parameter required" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		try:
			return Response(json.dumps({ "price" : round(stock_info.get_live_price(params["symbol"]), 2) }), status=HTTP_OK, mimetype="application/json")
		except:
			return Response(json.dumps({ "error" : INVALID_SYMBOL_PARAM, "message" : "Invalid symbol" }), status=HTTP_BAD_REQUEST, mimetype="application/json")


# /myshare/user/id
class ID(Resource):

	# get a user's id
	#
	# param : "username" the user's username (required)
	# param : "password" the user's password (required)
	def get(self):
		parser = reqparse.RequestParser()
		parser.add_argument("username")
		parser.add_argument("password")
		params = parser.parse_args()

		if params["username"] is None:
			return Response(json.dumps({ "error" : MISSING_USERNAME_PARAM, "message" : "'username' parameter required" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if params["password"] is None:
			return Response(json.dumps({ "error" : MISSING_PASSWORD_PARAM, "message" : "'password' parameter required" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if not checkUsernameFormat(params["username"]) or not checkPasswordFormat(params["password"]):
			return Response(json.dumps({ "id" : None }), status=HTTP_OK, mimetype="application/json")

		query = "SELECT Password, ID FROM Users WHERE Username = '{}';".format(params["username"])
		result = executeDatabaseQuery(query)
		if result == []:
			return Response(json.dumps({ "id" : None }), status=HTTP_OK, mimetype="application/json")

		if sha256_crypt.verify(params["password"], result[0][0]):
			return Response(json.dumps({ "id" : result[0][1] }), status=HTTP_OK, mimetype="application/json")

		return Response(json.dumps({ "id" : None }), status=HTTP_OK, mimetype="application/json")


# /myshare/user/
class User(Resource):

	# get a user's username, email, first name, and last name
	#
	# param : "id" the user's id (required)
	# param : "password" the user's password (required)
	def get(self):
		parser = reqparse.RequestParser()
		parser.add_argument("id")
		parser.add_argument("password")
		params = parser.parse_args()

		if params["id"] is None:
			return Response(json.dumps({ "error" : MISSING_ID_PARAM, "message" : "'id' parameter required" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if params["password"] is None:
			return Response(json.dumps({ "error" : MISSING_PASSWORD_PARAM, "message" : "'password' parameter required" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if not checkIntFormat(params["id"]):
			return Response(json.dumps({ "error" : AUTHENTICATION_FAILED, "message" : "Id and password do not match" }), status=HTTP_FORBIDDEN, mimetype="application/json")
		if not checkPasswordFormat(params["password"]):
			return Response(json.dumps({ "error" : AUTHENTICATION_FAILED, "message" : "Id and password do not match" }), status=HTTP_FORBIDDEN, mimetype="application/json")

		query = "SELECT Password, Username, Email, FirstName, LastName FROM Users WHERE ID = {};".format(params["id"])
		result = executeDatabaseQuery(query)
		if result == []:
			return Response(json.dumps({ "error" : AUTHENTICATION_FAILED, "message" : "Id and password do not match" }), status=HTTP_FORBIDDEN, mimetype="application/json")

		if sha256_crypt.verify(params["password"], result[0][0]):
			return Response(json.dumps({ "username" : result[0][1], "email" : result[0][2], "firstName" : result[0][3], "lastName" : result[0][4] }), status=HTTP_OK, mimetype="application/json")

		return Response(json.dumps({ "error" : AUTHENTICATION_FAILED, "message" : "Id and password do not match" }), status=HTTP_FORBIDDEN, mimetype="application/json")


	# register a user
	#
	# param : "username" the user's username (required)
	# param : "password" the user's password (required)
	# param : "email" the user's email (required)
	# param : "firstName" the user's first name (required)
	# param : "lastName" the user's last name (required)
	def post(self):
		parser = reqparse.RequestParser()
		parser.add_argument("username")
		parser.add_argument("password")
		parser.add_argument("email")
		parser.add_argument("firstName")
		parser.add_argument("lastName")
		params = parser.parse_args()

		if params["username"] is None:
			return Response(json.dumps({ "error" : MISSING_USERNAME_PARAM, "message" : "'username' parameter required" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if params["password"] is None:
			return Response(json.dumps({ "error" : MISSING_PASSWORD_PARAM, "message" : "'password' parameter required" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if params["email"] is None:
			return Response(json.dumps({ "error" : MISSING_EMAIL_PARAM, "message" : "'email' parameter required" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if params["firstName"] is None:
			return Response(json.dumps({ "error" : MISSING_FIRST_NAME_PARAM, "message" : "'firstName' parameter required" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if params["lastName"] is None:
			return Response(json.dumps({ "error" : MISSING_LAST_NAME_PARAM, "message" : "'lastName' parameter required" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if not checkUsernameFormat(params["username"]):
			return Response(json.dumps({ "error" : INVALID_USERNAME_PARAM, "message" : "Invalid username" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if not checkPasswordFormat(params["password"]):
			return Response(json.dumps({ "error" : INVALID_PASSWORD_PARAM, "message" : "Invalid Password" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if not checkEmailFormat(params["email"]):
			return Response(json.dumps({ "error" : INVALID_EMAIL_PARAM, "message" : "Invalid email" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if not checkNameFormat(params["firstName"]):
			return Response(json.dumps({ "error" : INVALID_FIRST_NAME_PARAM, "message" : "Invalid first name" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if not checkNameFormat(params["lastName"]):
			return Response(json.dumps({ "error" : INVALID_LAST_NAME_PARAM, "message" : "Invalid last name" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if not usernameAvailable(params["username"]):
			return Response(json.dumps({ "error" : USERNAME_ALREADY_TAKEN, "message" : "Username is already taken" }), status=HTTP_FORBIDDEN, mimetype="application/json")

		if not emailAvailable(params["email"]):
			return Response(json.dumps({ "error" : EMAIL_ALREADY_TAKEN, "message" : "Email is already taken" }), status=HTTP_FORBIDDEN, mimetype="application/json")

		id = createUserId()
		password = sha256_crypt.encrypt(params["password"])
		statement = "INSERT OR IGNORE INTO Users (ID, Username, Password, Email, FirstName, LastName) VALUES ({}, '{}', '{}', '{}', '{}', '{}');".format(id, params["username"], password, params["email"], params["firstName"], params["lastName"])
		update = executeDatabaseUpdate(statement)
		if update.rowcount == 0:
			return Response(json.dumps({ "message" : "Internal Server Error" }), status=HTTP_INTERNAL_SERVER_ERROR, mimetype="application/json")
		return Response(json.dumps({ "id" : id }), status=HTTP_OK, mimetype="application/json")


	# edit a user's information
	#
	# param : "id" the user's id (required)
	# param : "password" the user's password (required)
	# param : "username" the user's new username (*)
	# param : "newPassword" the user's new password (*)
	# param : "email" the user's new email (*)
	# param : "firstName" the user's new first name (*)
	# param : "lastName" the user's new last name (*)
	#
	# (*) at least one of these parameters is required
	def patch(self):
		parser = reqparse.RequestParser()
		parser.add_argument("id")
		parser.add_argument("password")
		parser.add_argument("username")
		parser.add_argument("newPassword")
		parser.add_argument("email")
		parser.add_argument("firstName")
		parser.add_argument("lastName")
		params = parser.parse_args()

		if params["id"] is None:
			return Response(json.dumps({ "error" : MISSING_ID_PARAM, "message" : "'id' parameter required" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if params["password"] is None:
			return Response(json.dumps({ "error" : MISSING_PASSWORD_PARAM, "message" : "'password' parameter required" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if not checkIntFormat(params["id"]):
			return Response(json.dumps({ "error" : AUTHENTICATION_FAILED, "message" : "Id and password do not match" }), status=HTTP_FORBIDDEN, mimetype="application/json")

		if not checkPasswordFormat(params["password"]):
			return Response(json.dumps({ "error" : AUTHENTICATION_FAILED, "message" : "Id and password do not match" }), status=HTTP_FORBIDDEN, mimetype="application/json")

		if not matchIdAndPassword(params["id"], params["password"]):
			return Response(json.dumps({ "error" : AUTHENTICATION_FAILED, "message" : "Id and password do not match" }), status=HTTP_FORBIDDEN, mimetype="application/json")

		updates = ""

		if params["username"] is not None:
			if not checkUsernameFormat(params["username"]):
				return Response(json.dumps({ "error" : INVALID_USERNAME_PARAM, "message" : "Invalid username" }), status=HTTP_BAD_REQUEST, mimetype="application/json")
			updates += ", Username = '{}'".format(params["username"])

		if params["email"] is not None:
			if not checkEmailFormat(params["email"]):
				return Response(json.dumps({ "error" : INVALID_EMAIL_PARAM, "message" : "Invalid email" }), status=HTTP_BAD_REQUEST, mimetype="application/json")
			updates += ", Email = '{}'".format(params["email"])

		if params["newPassword"] is not None:
			if not checkPasswordFormat(params["newPassword"]):
				return Response(json.dumps({ "error" : INVALID_NEW_PASSWORD_PARAM, "message" : "Invalid new password" }), status=HTTP_BAD_REQUEST, mimetype="application/json")
			updates += ", Password = '{}'".format(sha256_crypt.encrypt(params["newPassword"]))

		if params["firstName"] is not None:
			if not checkNameFormat(params["firstName"]):
				return Response(json.dumps({ "error" : INVALID_FIRST_NAME_PARAM, "message" : "Invalid first name" }), status=HTTP_BAD_REQUEST, mimetype="application/json")
			updates += ", FirstName = '{}'".format(params["firstName"])

		if params["lastName"] is not None:
			if not checkNameFormat(params["lastName"]):
				return Response(json.dumps({ "error" : INVALID_LAST_NAME_PARAM, "message" : "Invalid last name" }), status=HTTP_BAD_REQUEST, mimetype="application/json")
			updates += ", LastName = '{}'".format(params["lastName"])

		if params["username"] is not None:
			if not usernameAvailable(params["username"]) and not userOwnsUsername(params["id"], params["username"]):
				return Response(json.dumps({ "error" : USERNAME_ALREADY_TAKEN, "message" : "Username is already taken" }), status=HTTP_FORBIDDEN, mimetype="application/json")

		if params["email"] is not None:
			if not emailAvailable(params["email"]) and not userOwnsEmail(params["id"], params["email"]):
				return Response(json.dumps({ "error" : EMAIL_ALREADY_TAKEN, "message" : "Email is already taken" }), status=HTTP_FORBIDDEN, mimetype="application/json")

		if len(updates) == 0:
			return Response(json.dumps({ "error" : MISSING_REQUIRED_PARAMS, "message" : "'username' and/or 'newPassword' and/or 'email' and/or 'firstName' and/or 'lastName' parameter(s) required" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		statement = "UPDATE Users SET {} WHERE ID = {};".format(updates[2:], params["id"])
		update = executeDatabaseUpdate(statement)
		if update.rowcount == 0:
			return Response(json.dumps({ "message" : "Internal Server Error" }), status=HTTP_INTERNAL_SERVER_ERROR, mimetype="application/json")

		query = "SELECT Username, Email, FirstName, LastName FROM Users WHERE ID = {};".format(params["id"])
		result = executeDatabaseQuery(query)

		if result == []:
			return Response(json.dumps({ "message" : "Internal Server Error" }), status=HTTP_INTERNAL_SERVER_ERROR, mimetype="application/json")

		return Response(json.dumps({ "username" : result[0][0], "email" : result[0][1], "firstName" : result[0][2], "lastName" : result[0][3] }), status=HTTP_OK, mimetype="application/json")


	# remove a user and all of their data
	#
	# param : "id" the user's id (required)
	# param : "password" the user's password (required)
	def delete(self):
		parser = reqparse.RequestParser()
		parser.add_argument("id")
		parser.add_argument("password")
		params = parser.parse_args()

		if params["id"] is None:
			return Response(json.dumps({ "error" : MISSING_ID_PARAM, "message" : "'id' parameter required" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if params["password"] is None:
			return Response(json.dumps({ "error" : MISSING_PASSWORD_PARAM, "message" : "'password' parameter required" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if not checkIntFormat(params["id"]):
			return Response(json.dumps({ "error" : AUTHENTICATION_FAILED, "message" : "Id and password do not match" }), status=HTTP_FORBIDDEN, mimetype="application/json")

		if not checkPasswordFormat(params["password"]):
			return Response(json.dumps({ "error" : AUTHENTICATION_FAILED, "message" : "Id and password do not match" }), status=HTTP_FORBIDDEN, mimetype="application/json")

		if not matchIdAndPassword(params["id"], params["password"]):
			return Response(json.dumps({ "error" : AUTHENTICATION_FAILED, "message" : "Id and password do not match" }), status=HTTP_FORBIDDEN, mimetype="application/json")

		statement = "DELETE FROM Users WHERE ID = {};".format(params["id"])
		delete = executeDatabaseUpdate(statement)
		if delete.rowcount == 0:
			return Response(json.dumps({ "message" : "Internal Server Error" }), status=HTTP_INTERNAL_SERVER_ERROR, mimetype="application/json")

		return Response(json.dumps({ "id" : params["id"] }), status=HTTP_OK, mimetype="application/json")


# /myshare/user/holdings
class Holdings(Resource):

	# get a user's holdings
	#
	# param : "id" the user's id (required)
	# param : "password" the user's password (required)
	# param : "symbol" a filter to return holdings of only a specific symbol
	def get(self):
		parser = reqparse.RequestParser()
		parser.add_argument("id")
		parser.add_argument("password")
		parser.add_argument("symbol")
		params = parser.parse_args()

		if params["id"] is None:
			return Response(json.dumps({ "error" : MISSING_ID_PARAM, "message" : "'id' parameter required" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if params["password"] is None:
			return Response(json.dumps({ "error" : MISSING_PASSWORD_PARAM, "message" : "'password' parameter required" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if not checkIntFormat(params["id"]):
			return Response(json.dumps({ "error" : AUTHENTICATION_FAILED, "message" : "Id and password do not match" }), status=HTTP_FORBIDDEN, mimetype="application/json")

		if not checkPasswordFormat(params["password"]):
			return Response(json.dumps({ "error" : AUTHENTICATION_FAILED, "message" : "Id and password do not match" }), status=HTTP_FORBIDDEN, mimetype="application/json")

		if not matchIdAndPassword(params["id"], params["password"]):
			return Response(json.dumps({ "error" : AUTHENTICATION_FAILED, "message" : "Id and password do not match" }), status=HTTP_FORBIDDEN, mimetype="application/json")

		symbolFilter = ""
		if params["symbol"] is not None:
			if not checkSymbolFormat(params["symbol"]) or not symbolExists(params["symbol"]):
				return Response(json.dumps({ "error" : INVALID_SYMBOL_PARAM, "message" : "Invalid symbol" }), status=HTTP_BAD_REQUEST, mimetype="application/json")
			
			if not symbolHeldByUser(params["symbol"], params["id"]):
				return Response(json.dumps({ "symbol" : symbol.upper(), "shares" : 0, "currentPrice" : round(stock_info.get_live_price(symbol), 2), "avgCostPerShare" : None, "totalPrinciple" : 0.0, "marketValue" : 0.0, "valueIncrease" : 0.0, "lots" : [] }), status=HTTP_OK, mimetype="application/json")
			
			symbolFilter = "AND Symbol = '{}'".format(params["symbol"].upper())

		holdings = []
		totalPrinciple = 0.0
		totalValueIncrease = 0.0
		symbol = None
		currentPrice = None
		lot = None
		lots = None
		shares = None
		buyPrice = None
		buyDate = None
		symbolShares = None
		symbolPrinciple = None

		query = "SELECT Symbol, LotID, ShareID, BuyPrice, BuyDate FROM Holdings WHERE User = {} {}AND SellLotID IS NULL ORDER BY Symbol, BuyDate DESC, LotID;".format(params["id"], symbolFilter)
		result = executeDatabaseQuery(query)
		
		for row in result:
			# for the first returned row, save the row's information
			if symbol is None:
				symbol = row[0]
				currentPrice = round(stock_info.get_live_price(symbol), 2)
				lot = int(row[1])
				lots = []
				shares = [int(row[2])]
				buyPrice = round(float(row[3]), 2)
				buyDate = row[4]
				symbolShares = 1
				symbolPrinciple = buyPrice
			
			# if the symbol is different than the current symbol, add the current lot to lots,
			# then add lots to holdings, then save this row's information
			elif symbol != row[0]:
				lots.append({ "lotId" : lot, "buyPrice" : buyPrice, "buyDate" : buyDate, "valueIncrease": round((currentPrice - buyPrice) * len(shares), 2), "shares" : len(shares), "shareIds" : shares })
				info = yfinance.Ticker(symbol)
				info.info.update({ "currentPrice" : currentPrice })
				holdings.append({ "symbol" : symbol, "shares" : symbolShares, "avgCostPerShare" : round(symbolPrinciple / symbolShares, 2), "principle" : round(symbolPrinciple, 2), "marketValue" : round(currentPrice * symbolShares, 2), "valueIncrease" : round((currentPrice * symbolShares) - symbolPrinciple, 2), "lots" : lots, "info" : info.info })
				totalValueIncrease += round((currentPrice * symbolShares) - symbolPrinciple, 2)
				totalPrinciple += round(symbolPrinciple, 2)
				symbol = row[0]
				currentPrice = round(stock_info.get_live_price(symbol), 2)
				lot = int(row[1])
				lots = []
				shares = [int(row[2])]
				buyPrice = round(float(row[3]), 2)
				buyDate = row[4]
				symbolShares = 1
				symbolPrinciple = buyPrice
			
			# if only the lot is different than the current lot, add the current lot to lots,
			# then save this this lot
			elif lot != int(row[1]):
				lots.append({ "lotId" : lot, "buyPrice" : buyPrice, "buyDate" : buyDate, "valueIncrease": round((currentPrice - buyPrice) * len(shares), 2), "shares" : len(shares), "shareIds" : shares })
				lot = int(row[1])
				shares = [int(row[2])]
				buyPrice = round(float(row[3]), 2)
				buyDate = row[4]
				symbolShares += 1
				symbolPrinciple += buyPrice
			
			# otherwise, add this share to shares
			else:
				symbolShares += 1
				symbolPrinciple += buyPrice
				shares.append(int(row[2]))

		# add the saved information from the last returned row to lots and holdings
		if symbol is not None:
			lots.append({ "lotId" : lot, "buyPrice" : buyPrice, "buyDate" : buyDate, "valueIncrease": round((currentPrice - buyPrice) * len(shares), 2), "shares" : len(shares), "shareIds" : shares })
			info = yfinance.Ticker(symbol)
			info.info.update({ "currentPrice" : currentPrice })
			holdings.append({ "symbol" : symbol, "shares" : symbolShares, "avgCostPerShare" : round(symbolPrinciple / symbolShares, 2), "principle" : round(symbolPrinciple, 2), "marketValue" : round(currentPrice * symbolShares, 2), "valueIncrease" : round((currentPrice * symbolShares) - symbolPrinciple, 2), "lots" : lots, "info" : info.info })
			totalValueIncrease += round((currentPrice * symbolShares) - symbolPrinciple, 2)
			totalPrinciple += round(symbolPrinciple, 2)

		if params["symbol"] is not None:
			return Response(json.dumps(holdings[0]), status=HTTP_OK, mimetype="application/json")

		return Response(json.dumps({ "id" : int(params["id"]), "totalPrinciple" : round(totalPrinciple, 2), "marketValue": round(totalPrinciple + totalValueIncrease, 2), "totalValueIncrease" : totalValueIncrease, "holdings" : holdings }), status=HTTP_OK, mimetype="application/json")


# /myshare/user/lots
class Lots(Resource):

	# get a user's lots
	#
	# param : "id" the user's id (required)
	# param : "password" the user's password (required)
	# param : "lotId" a filter to return info of only a specific lot
	def get(self):
		parser = reqparse.RequestParser()
		parser.add_argument("id")
		parser.add_argument("password")
		parser.add_argument("lotId")
		params = parser.parse_args()

		if params["id"] is None:
			return Response(json.dumps({ "error" : MISSING_ID_PARAM, "message" : "'id' parameter required" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if params["password"] is None:
			return Response(json.dumps({ "error" : MISSING_PASSWORD_PARAM, "message" : "'password' parameter required" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if not checkIntFormat(params["id"]):
			return Response(json.dumps({ "error" : AUTHENTICATION_FAILED, "message" : "Id and password do not match" }), status=HTTP_FORBIDDEN, mimetype="application/json")

		if not checkPasswordFormat(params["password"]):
			return Response(json.dumps({ "error" : AUTHENTICATION_FAILED, "message" : "Id and password do not match" }), status=HTTP_FORBIDDEN, mimetype="application/json")

		if not matchIdAndPassword(params["id"], params["password"]):
			return Response(json.dumps({ "error" : AUTHENTICATION_FAILED, "message" : "Id and password do not match" }), status=HTTP_FORBIDDEN, mimetype="application/json")

		lotFilter = ""
		if params["lotId"] is not None:
			if not lotOwnedByUser(params["lotId"], params["id"]):
				return Response(json.dumps({ "error" : OWNERSHIP_AUTHENTICATION_FAILED, "message" : "User does not own this lot" }), status=HTTP_FORBIDDEN, mimetype="application/json")
			lotFilter = "LotID = {} AND ".format(params["lotId"])

		lots = []
		totalProfitFromSelling = 0.0
		totalValueIncrease = 0.0
		totalPrinciple = 0.0
		lot = None
		symbol = None
		buyPrice = None
		buyDate = None
		currentPrice = None
		sellLots = None
		holding = None
		sellLot = None
		sold = None
		profitFromSelling = None
		
		query = "SELECT LotID, Symbol, ShareID, BuyPrice, BuyDate, SellLotID, SellPrice, SellDate FROM Holdings WHERE {}User = {} ORDER BY BuyDate DESC, LotID, SellDate DESC, SellLotID;".format(lotFilter, params["id"])
		
		result = executeDatabaseQuery(query)
		for row in result:
			# for the first returned row, save the row's information
			if lot is None:
				lot = int(row[0])
				symbol = row[1]
				buyPrice = round(float(row[3]), 2)
				buyDate = row[4]
				currentPrice = round(stock_info.get_live_price(symbol), 2)
				holding = []
				sellLots = []
				sold = 0
				profitFromSelling = 0.0
				# if this share was not sold, add it to the holdings array
				if row[5] is None:
					holding.append(int(row[2]))

				# otherwise initialize a sell lot and add this share to its shareIds 
				else:
					sellLot = { "sellLotId" : int(row[5]), "sellPrice" : round(float(row[6]), 2), "sellDate" : row[7], "shareIds" : [int(row[2])] }
					sold += 1

			# if the lot is different than the previous row, add the current lot to lots,
			# then save this row's information
			elif lot != row[0]:
				# if there is a saved sell lot, add it to sellLots
				if sellLot is not None:
					sellLotShares = len(sellLot["shareIds"])
					sellLotProfit = (sellLot["sellPrice"] - buyPrice) * sellLotShares
					profitFromSelling += sellLotProfit
					sellLot.update({ "shares" : sellLotShares, "profit" : round(sellLotProfit, 2)} )
					sellLots.append(sellLot)

				sharesHolding = len(holding)
				valueIncrease = round((currentPrice - buyPrice) * sharesHolding, 2)
				totalValueIncrease += valueIncrease
				totalPrinciple += round(buyPrice * sharesHolding, 2)
				totalProfitFromSelling += profitFromSelling
				lots.append({ "lotId" : lot, "symbol" : symbol, "buyPrice" : buyPrice, "buyDate" : buyDate, "currentPrice" : currentPrice, "profitFromSelling" : round(profitFromSelling, 2), "holdingValueIncrease" : valueIncrease, "sharesHolding" : sharesHolding, "holding" : holding, "sharesSold" : sold, "sellLots" : sellLots })
				lot = int(row[0])
				symbol = row[1]
				buyPrice = round(float(row[3]), 2)
				buyDate = row[4]
				currentPrice = round(stock_info.get_live_price(symbol), 2)
				holding = []
				sellLots = []
				sellLot = None
				sold = 0
				profitFromSelling = 0.0
				# if this share was not sold, add it to the holdings array
				if row[5] is None:
					holding.append(int(row[2]))
				
				# otherwise initialize a sell lot and add this share to its shareIds 
				else:
					sellLot = { "sellLotId" : int(row[5]), "sellPrice" : round(float(row[6]), 2), "sellDate" : row[7], "shareIds" : [int(row[2])] }
					sold += 1

			else:
				# otherwise if this share was not sold add it to the holding array
				if row[5] is None:
					holding.append(int(row[2]))

					# if there is a saved sell lot, add it to sellLots
					if sellLot is not None:
						sellLotShares = len(sellLot["shareIds"])
						sellLotProfit = (sellLot["sellPrice"] - buyPrice) * sellLotShares
						profitFromSelling += sellLotProfit
						sellLot.update({ "shares" : sellLotShares, "profit" : round(sellLotProfit, 2) })
						sellLots.append(sellLot)
						sellLot = None

				elif sellLot is not None:
					# otherwise if there is a saved sell lot and this share is from another lot,
					# add the current sell lot to sellLots, then initialize a sell lot and add this share to its shareIds
					if sellLot["sellLotId"] != int(row[5]):
						sellLotShares = len(sellLot["shareIds"])
						sellLotProfit = (sellLot["sellPrice"] - buyPrice) * sellLotShares
						profitFromSelling += sellLotProfit
						sellLot.update({ "shares" : sellLotShares, "profit" : sellLotProfit } )
						sellLots.append(sellLot)
						sellLot = { "sellLotId" : int(row[5]), "sellPrice" : round(float(row[6]), 2), "sellDate" : row[7], "shareIds" : [int(row[2])] }
					
					# otherwise if there is a saved sell lot and this share is from that lot,
					# add this share to the lot's shareIds
					else:
						sellLot["shareIds"].append(int(row[2]))
					sold += 1

				# otherwise initialize a sell lot and add this share to its shareIds 
				else:
					sellLot = { "sellLotId" : int(row[5]), "sellPrice" : round(float(row[6]), 2), "sellDate" : row[7], "shareIds" : [int(row[2])] }
					sold += 1

		# append the saved information from the last returned row to lots
		if lot is not None:

			# if there is a saved sell lot, add it to sellLots
			if sellLot is not None:
				sellLotShares = len(sellLot["shareIds"])
				sellLotProfit = (sellLot["sellPrice"] - buyPrice) * sellLotShares
				profitFromSelling += sellLotProfit
				sellLot.update({ "shares" : sellLotShares, "profit" : round(sellLotProfit, 2) })
				sellLots.append(sellLot)

			sharesHolding = len(holding)
			valueIncrease = round((currentPrice - buyPrice) * sharesHolding, 2)
			totalValueIncrease += valueIncrease
			totalPrinciple += round(buyPrice * sharesHolding, 2)
			totalProfitFromSelling += profitFromSelling
			lots.append({ "lotId" : lot, "symbol" : symbol, "buyPrice" : buyPrice, "buyDate" : buyDate, "currentPrice" : currentPrice, "profitFromSelling" : round(profitFromSelling, 2), "holdingValueIncrease" : valueIncrease, "sharesHolding" : sharesHolding, "holding" : holding, "sharesSold" : sold, "sellLots" : sellLots })

		if params["lotId"] is not None:
			return Response(json.dumps(lots[0]), status=HTTP_OK, mimetype="application/json")

		return Response(json.dumps({ "id" : int(params["id"]), "currentPrinciple" : totalPrinciple, "totalValueIncrease" : round(totalValueIncrease, 2), "totalProfitFromSelling": round(totalProfitFromSelling, 2), "lots" : lots }), status=HTTP_OK, mimetype="application/json")


	# add a new lot for a user
	#
	# param : "id" the user's id (required)
	# param : "password" the user's password (required)
	# param : "symbol" the symbol of the shares purchased (required)
	# param : "shares" the number of shares purchased (required)
	# param : "buyPrice" the price at which the shares were purchased (required)
	# param : "buyDate" the date the lot was purchased (required)
	def post(self):
		parser = reqparse.RequestParser()
		parser.add_argument("id")
		parser.add_argument("password")
		parser.add_argument("symbol")
		parser.add_argument("shares")
		parser.add_argument("buyPrice")
		parser.add_argument("buyDate")
		params = parser.parse_args()

		if params["id"] is None:
			return Response(json.dumps({ "error" : MISSING_ID_PARAM, "message" : "'id' parameter required" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if params["password"] is None:
			return Response(json.dumps({ "error" : MISSING_PASSWORD_PARAM, "message" : "'password' parameter required" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if not checkIntFormat(params["id"]):
			return Response(json.dumps({ "error" : AUTHENTICATION_FAILED, "message" : "Id and password do not match" }), status=HTTP_FORBIDDEN, mimetype="application/json")

		if not checkPasswordFormat(params["password"]):
			return Response(json.dumps({ "error" : AUTHENTICATION_FAILED, "message" : "Id and password do not match" }), status=HTTP_FORBIDDEN, mimetype="application/json")

		if not matchIdAndPassword(params["id"], params["password"]):
			return Response(json.dumps({ "error" : AUTHENTICATION_FAILED, "message" : "Id and password do not match" }), status=HTTP_FORBIDDEN, mimetype="application/json")

		if params["symbol"] is None:
			return Response(json.dumps({ "error" : MISSING_SYMBOL_PARAM, "message" : "'symbol' parameter required" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if params["shares"] is None:
			return Response(json.dumps({ "error" : MISSING_SHARES_PARAM, "message" : "'shares' parameter required" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if params["buyPrice"] is None:
			return Response(json.dumps({ "error" : MISSING_BUY_PRICE_PARAM, "message" : "'buyPrice' parameter required" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if params["buyDate"] is None:
			return Response(json.dumps({ "error" : MISSING_BUY_DATE_PARAM, "message" : "'buyDate' parameter required" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if not checkIntFormat(params["shares"]) or int(params["shares"]) <= 0:
			return Response(json.dumps({ "error" : INVALID_SHARES_PARAM, "message" : "Invalid amount of shares" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if not checkDollarFormat(params["buyPrice"]):
			return Response(json.dumps({ "error" : INVALID_BUY_PRICE_PARAM, "message" : "Invalid buy price" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if not checkDateFormat(params["buyDate"]):
			return Response(json.dumps({ "error" : INVALID_BUY_DATE_PARAM, "message" : "Invalid buy date" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if not symbolExists(params["symbol"]):
			return Response(json.dumps({ "error" : INVALID_SYMBOL_PARAM, "message" : "Invalid symbol" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		lotId = createLotId()
		shareIds = createShareIds(int(params["shares"]))
		insertValues = ""
		for shareId in shareIds:
			insertValues += ", ({}, {}, {}, '{}', {}, '{}')".format(shareId, lotId, params["id"], params["symbol"].upper(), params["buyPrice"], params["buyDate"])

		statement = "INSERT INTO Holdings (ShareID, LotID, User, Symbol, BuyPrice, BuyDate) VALUES {};".format(insertValues[2:])
		update = executeDatabaseUpdate(statement)
		if update.rowcount == 0:
			return Response(json.dumps({ "message" : "Internal Server Error" }), status=HTTP_INTERNAL_SERVER_ERROR, mimetype="application/json")

		return Response(json.dumps({ "user" : int(params["id"]), "symbol" : params["symbol"].upper(), "shares" : int(params["shares"]), "buyPrice" : float(params["buyPrice"]), "buyDate" : params["buyDate"], "lotId" : lotId, "shareIds" : shareIds }), status=HTTP_OK, mimetype="application/json")


	# edit a lot's information
	#
	# param : "id" the user's id (required)
	# param : "password" the user's password (required)
	# param : "lotId" the lot to be edited (required)
	# param : "shares" the new number of shares purchased (*)
	# param : "buyPrice" the new price at which the shares were bought (*)
	# param : "buyDate" the new date at which the lot was purchased (*)
	#
	# (*) at least one of these parameters is required
	def patch(self):
		parser = reqparse.RequestParser()
		parser.add_argument("id")
		parser.add_argument("password")
		parser.add_argument("lotId")
		parser.add_argument("shares")
		parser.add_argument("buyPrice")
		parser.add_argument("buyDate")
		params = parser.parse_args()

		if params["id"] is None:
			return Response(json.dumps({ "error": MISSING_ID_PARAM, "message" : "'id' parameter required" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if params["password"] is None:
			return Response(json.dumps({ "error": MISSING_PASSWORD_PARAM, "message" : "'password' parameter required" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if params["lotId"] is None:
			return Response(json.dumps({ "error": MISSING_LOT_ID_PARAM, "message" : "'lotId' parameter required" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if params["shares"] is None and params["buyPrice"] is None and params["buyDate"] is None:
			return Response(json.dumps({ "error": MISSING_REQUIRED_PARAMS, "message" : "'shares' and/or 'buyPrice' and/or 'buyDate' parameter(s) required" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if not checkIntFormat(params["id"]):
			return Response(json.dumps({ "error": AUTHENTICATION_FAILED, "message" : "Id and password do not match" }), status=HTTP_FORBIDDEN, mimetype="application/json")

		if not checkPasswordFormat(params["password"]):
			return Response(json.dumps({ "error": AUTHENTICATION_FAILED, "message" : "Id and password do not match" }), status=HTTP_FORBIDDEN, mimetype="application/json")

		if not matchIdAndPassword(params["id"], params["password"]):
			return Response(json.dumps({ "error": AUTHENTICATION_FAILED, "message" : "Id and password do not match" }), status=HTTP_FORBIDDEN, mimetype="application/json")

		if not lotOwnedByUser(params["lotId"], params["id"]):
			return Response(json.dumps({ "error": OWNERSHIP_AUTHENTICATION_FAILED, "message" : "User does not own this lot" }), status=HTTP_FORBIDDEN, mimetype="application/json")

		infoChanges = ""
		if params["buyPrice"] is not None:
			if not checkDollarFormat(params["buyPrice"]):
				return Response(json.dumps({ "error" : INVALID_BUY_PRICE_PARAM, "message" : "Invalid buy price" }), status=HTTP_BAD_REQUEST, mimetype="application/json")
			infoChanges += ", BuyPrice = {}".format(params["buyPrice"])

		if params["buyDate"] is not None:
			if not checkDateFormat(params["buyDate"]):
				return Response(json.dumps({ "error" : INVALID_BUY_DATE_PARAM, "message" : "Invalid buy date" }), status=HTTP_BAD_REQUEST, mimetype="application/json")
			infoChanges += ", BuyDate = '{}'".format(params["buyDate"])

		if params["shares"] is not None:
			if not checkIntFormat(params["shares"]) or int(params["shares"]) <= 0:
				return Response(json.dumps({ "error" : INVALID_SHARES_PARAM, "message" : "Invalid amount of shares" }), status=HTTP_BAD_REQUEST, mimetype="application/json")
			query = "SELECT COUNT(*), User, Symbol, BuyPrice, BuyDate FROM Holdings WHERE LotID = {};".format(params["lotId"])
			result = executeDatabaseQuery(query)
			currentShares = int(result[0][0])
			user = int(result[0][1])
			symbol = result[0][2]
			buyPrice = round(float(result[0][3]), 2)
			buyDate = result[0][4]

			# increase number of shares in this lot
			if currentShares < int(params["shares"]):
				shareIds = createShareIds(int(params["shares"]) - int(currentShares))
				insertValues = ""
				for shareId in shareIds:
					insertValues += ", ({}, {}, {}, '{}', {}, '{}')".format(shareId, params["lotId"], user, symbol, buyPrice, buyDate)

				statement = "INSERT INTO Holdings (ShareID, LotID, User, Symbol, BuyPrice, BuyDate) VALUES {};".format(insertValues[2:])
				update = executeDatabaseUpdate(statement)
				if update.rowcount == 0:
					return Response(json.dumps({ "message" : "Internal Server Error" }), status=HTTP_INTERNAL_SERVER_ERROR, mimetype="application/json")

			# decrease number of shares in this lot
			elif currentShares > int(params["shares"]):
				remove = currentShares - int(params["shares"])
				query = "SELECT COUNT(*) FROM Holdings WHERE LotID = {} AND SellLotID IS NULL;".format(params["lotId"])
				result = executeDatabaseQuery(query)

				# if there are enough unsold shares left in the lot, remove them
				if int(result[0][0]) >= remove:
					shareDeleteFilter = ""
					query = "SELECT ShareId FROM Holdings WHERE LotID = {} AND SellLotID IS NULL LIMIT {};".format(params["lotId"], remove)
					result = executeDatabaseQuery(query)
					for row in result:
						shareDeleteFilter += " OR ShareId = {}".format(row[0])
					statement = "DELETE FROM Holdings WHERE {}".format(shareDeleteFilter[4:])
					delete = executeDatabaseUpdate(statement)
					if delete.rowcount == 0:
						return Response(json.dumps({ "message" : "Internal Server Error" }), status=HTTP_INTERNAL_SERVER_ERROR, mimetype="application/json")

				# otherwise check if there are enough shares of this symbol to replace shares removed from sell lots
				else:
					removeFromSold = remove - int(result[0][0])
					query = "SELECT COUNT(*) FROM Holdings WHERE User = {} AND Symbol = '{}' AND LotID <> {} AND SellLotID IS NULL;".format(params["id"], symbol, params["lotId"])
					result = executeDatabaseQuery(query)
					otherHoldings = int(result[0][0])

					# if there aren't enough other shares of this symbol to replace the sold shares in this lot, throw an error
					if removeFromSold > otherHoldings:
						return Response(json.dumps({ "error" : BOUGHT_SOLD_DISCREPANCY, "message" : "Lowering the shares in this lot to {} would result in more shares being sold than bought".format(params["shares"]) }), status=HTTP_CONFLICT, mimetype="application/json")

					# otherwise remove the appropriate amount of shares in this lot and replace the ones that were sold
					query = "SELECT ShareID, SellLotID, SellPrice, SellDate FROM Holdings WHERE LotID = {} AND SellLotID IS NOT NULL LIMIT {};".format(params["lotId"], removeFromSold)
					result = executeDatabaseQuery(query)
					sharesToDelete = []
					for row in result:
						sharesToDelete.append(row[0])
						query = "SELECT ShareID FROM Holdings WHERE User = {} AND Symbol = '{}' AND LotID <> {} AND SellLotID IS NULL ORDER BY BuyPrice ASC, LotID LIMIT 1;".format(params["id"], symbol, params["lotId"])
						replacementShare = executeDatabaseQuery(query)
						statement = "UPDATE Holdings SET SellLotID = {}, SellPrice = {}, SellDate = '{}' WHERE ShareId = {};".format(row[1], row[2], row[3], replacementShare[0][0])
						update = executeDatabaseUpdate(statement)
						if update.rowcount == 0:
							return Response(json.dumps({ "message" : "Internal Server Error" }), status=HTTP_INTERNAL_SERVER_ERROR, mimetype="application/json")

					shareDeleteFilter = ""
					for share in sharesToDelete:
						shareDeleteFilter += " OR ShareID = {}".format(share)

					statement = "DELETE FROM Holdings WHERE {};".format(shareDeleteFilter[4:])
					delete = executeDatabaseUpdate(statement)
					if delete.rowcount == 0:
						return Response(json.dumps({ "message" : "Internal Server Error" }), status=HTTP_INTERNAL_SERVER_ERROR, mimetype="application/json")

					statement = "DELETE FROM Holdings WHERE LotID = {} AND SellLotID IS NULL;".format(params["lotId"])
					delete = executeDatabaseUpdate(statement)
					if delete.rowcount == 0:
						return Response(json.dumps({ "message" : "Internal Server Error" }), status=HTTP_INTERNAL_SERVER_ERROR, mimetype="application/json")

		if infoChanges != "":
			statement = "UPDATE Holdings SET {} WHERE LotID = {};".format(infoChanges[2:], params["lotId"])
			update = executeDatabaseUpdate(statement)
			if update.rowcount == 0:
				return Response(json.dumps({ "message" : "Internal Server Error" }), status=HTTP_INTERNAL_SERVER_ERROR, mimetype="application/json")

		query = "SELECT ShareID FROM Holdings WHERE LotID = {};".format(params["lotId"])
		result = executeDatabaseQuery(query)
		shareIds = []
		for row in result:
			shareIds.append(int(row[0]))

		query = "SELECT Symbol, BuyPrice, BuyDate FROM Holdings WHERE LotID = {};".format(params["lotId"])
		result = executeDatabaseQuery(query)
		return Response(json.dumps({ "user" : int(params["id"]), "symbol" : result[0][0], "shares" : len(shareIds), "buyPrice" : float(result[0][1]), "buyDate" : result[0][2], "lotId" : params["lotId"], "shareIds" : shareIds }), status=HTTP_OK, mimetype="application/json")


	# remove a lot and its data
	#
	# param : "id" the user's id (required)
	# param : "password" the user's password (required)
	# param : "lotId" the lot to be removed (required)
	def delete(self):
		parser = reqparse.RequestParser()
		parser.add_argument("id")
		parser.add_argument("password")
		parser.add_argument("lotId")
		params = parser.parse_args()

		if params["id"] is None:
			return Response(json.dumps({ "error" : MISSING_ID_PARAM, "message" : "'id' parameter required" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if params["password"] is None:
			return Response(json.dumps({ "error" : MISSING_PASSWORD_PARAM, "message" : "'password' parameter required" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if params["lotId"] is None:
			return Response(json.dumps({ "error" : MISSING_LOT_ID_PARAM, "message" : "'lotId' parameter required" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if not checkIntFormat(params["id"]):
			return Response(json.dumps({ "error" : AUTHENTICATION_FAILED, "message" : "Id and password do not match" }), status=HTTP_FORBIDDEN, mimetype="application/json")

		if not checkPasswordFormat(params["password"]):
			return Response(json.dumps({ "error" : AUTHENTICATION_FAILED, "message" : "Id and password do not match" }), status=HTTP_FORBIDDEN, mimetype="application/json")

		if not matchIdAndPassword(params["id"], params["password"]):
			return Response(json.dumps({ "error" : AUTHENTICATION_FAILED, "message" : "Id and password do not match" }), status=HTTP_FORBIDDEN, mimetype="application/json")

		if not lotOwnedByUser(params["lotId"], params["id"]):
			return Response(json.dumps({ "error" : OWNERSHIP_AUTHENTICATION_FAILED, "message" : "User does not own this lot" }), status=HTTP_FORBIDDEN, mimetype="application/json")

		query = "SELECT COUNT(*), Symbol FROM Holdings WHERE LotID = {};".format(params["lotId"])
		result = executeDatabaseQuery(query)
		totalShares = int(result[0][0])
		symbol = result[0][1]

		query = "SELECT COUNT(*), SellLotID, SellPrice, SellDate FROM Holdings WHERE LotID = {} AND SellLotID IS NOT NULL GROUP BY SellLotID;".format(params["lotId"])
		sellLots = executeDatabaseQuery(query)
		soldStocks = 0
		for row in sellLots:
			soldStocks += int(row[0])

		query = "SELECT COUNT(*) FROM Holdings WHERE User = {} AND Symbol = '{}' AND LotID <> {} AND SellLotID IS NULL;".format(params["id"], symbol, params["lotId"])
		result = executeDatabaseQuery(query)
		otherHoldings = int(result[0][0])
		if soldStocks > otherHoldings:
			return Response(json.dumps({ "error" : BOUGHT_SOLD_DISCREPANCY, "message" : "Deleting this lot would result in more shares being sold than bought" }), status=HTTP_CONFLICT, mimetype="application/json")

		for sellLot in sellLots:
			query = "SELECT ShareID FROM Holdings WHERE User = {} AND Symbol = '{}' AND LotID <> {} AND SellLotID IS NULL ORDER BY BuyPrice ASC, LotID LIMIT {};".format(params["id"], symbol, params["lotId"], sellLot[0])
			result = executeDatabaseQuery(query)
			shares = []
			shareFilter = ""
			for row in result:
				shares.append(int(row[0]))
				shareFilter += " OR ShareId = {}".format(row[0])

			statement = "UPDATE Holdings SET SellLotID = {}, SellPrice = {}, SellDate = '{}' WHERE {};".format(sellLot[1], sellLot[2], sellLot[3], shareFilter[4:])
			update = executeDatabaseUpdate(statement)
			if update.rowcount == 0:
				return Response(json.dumps({ "message" : "Internal Server Error" }), status=HTTP_INTERNAL_SERVER_ERROR, mimetype="application/json")

		statement = "DELETE FROM Holdings WHERE LotID = {};".format(params["lotId"])
		delete = executeDatabaseUpdate(statement)
		if delete.rowcount == 0:
			return Response(json.dumps({ "message" : "Internal Server Error" }), status=HTTP_INTERNAL_SERVER_ERROR, mimetype="application/json")
		return Response(json.dumps({ "lotId" : int(params["lotId"]) }), status=HTTP_OK, mimetype="application/json")


# /myshare/user/sell-lots
class SellLots(Resource):

	# get a user's sell lots
	#
	# param : "id" the user's id (required)
	# param : "password" the user's password (required)
	# param : "sellLotId" a filter to return info of only a specific sell lot
	def get(self):
		parser = reqparse.RequestParser()
		parser.add_argument("id")
		parser.add_argument("password")
		parser.add_argument("sellLotId")
		params = parser.parse_args()

		if params["id"] is None:
			return Response(json.dumps({ "error" : MISSING_ID_PARAM, "message" : "'id' parameter required" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if params["password"] is None:
			return Response(json.dumps({ "error" : MISSING_PASSWORD_PARAM, "message" : "'password' parameter required" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if not checkIntFormat(params["id"]):
			return Response(json.dumps({ "error" : AUTHENTICATION_FAILED, "message" : "Id and password do not match" }), status=HTTP_FORBIDDEN, mimetype="application/json")

		if not checkPasswordFormat(params["password"]):
			return Response(json.dumps({ "error" : AUTHENTICATION_FAILED, "message" : "Id and password do not match" }), status=HTTP_FORBIDDEN, mimetype="application/json")

		if not matchIdAndPassword(params["id"], params["password"]):
			return Response(json.dumps({ "error" : AUTHENTICATION_FAILED, "message" : "Id and password do not match" }), status=HTTP_FORBIDDEN, mimetype="application/json")

		sellLotFilter = "IS NOT NULL"
		if params["sellLotId"] is not None:
			if not lotSoldByUser(params["sellLotId"], params["id"]):
				return Response(json.dumps({ "error" : OWNERSHIP_AUTHENTICATION_FAILED, "message" : "User has not sold this lot" }), status=HTTP_FORBIDDEN, mimetype="application/json")
			sellLotFilter = "= {}".format(params["sellLotId"])

		sellLots = []
		symbol = None
		sellLot = None
		shares = None
		sellLotSharesCount = None
		buyPrice = None
		buyDate = None
		sellPrice = None
		sellDate = None
		lot = None
		lots = None
		totalProfit = 0.0
		totalWithdrawn = 0.0
		sellLotProfit = 0.0

		query = "SELECT Symbol, SellLotID, ShareID, BuyPrice, BuyDate, SellPrice, SellDate, LotID FROM Holdings WHERE User = {} AND SellLotID {} ORDER BY SellDate DESC, SellLotID, BuyDate, LotID;".format(params["id"], sellLotFilter)
		result = executeDatabaseQuery(query)
		
		for row in result:
			# for the first returned row, save the row's information
			if symbol is None:
				symbol = row[0]
				sellLot = int(row[1])
				buyPrice = round(float(row[3]), 2)
				buyDate = row[4]
				sellPrice = round(float(row[5]), 2)
				sellDate = row[6]
				lot = { "lotId" : int(row[7]), "buyPrice": buyPrice, "buyDate": buyDate }
				lots = []
				shares = [int(row[2])]
				sellLotSharesCount = 1

			# if the sell lot is different than the current sell lot,
			# add the current sell lot to sell lots then then save this row's information
			elif sellLot != row[1]:
				lotProfit = len(shares) * (sellPrice - buyPrice)
				sellLotProfit += lotProfit
				totalProfit += sellLotProfit
				totalWithdrawn += sellLotSharesCount * sellPrice
				lot.update({ "profit" : round(lotProfit, 2), "shares" : len(shares), "shareIds" : shares })
				lots.append(lot)
				sellLots.append({ "sellLotId" : sellLot, "symbol" : symbol,  "sellPrice" : sellPrice, "sellDate" : sellDate, "profit" : round(sellLotProfit, 2), "sharesSold" : sellLotSharesCount, "lots" : lots })
				symbol = row[0]
				sellLot = int(row[1])
				buyPrice = round(float(row[3]), 2)
				buyDate = row[4]
				sellPrice = round(float(row[5]), 2)
				sellDate = row[6]
				lot = { "lotId" : int(row[7]), "buyPrice": buyPrice, "buyDate": buyDate }
				lots = []
				shares = [int(row[2])]
				sellLotSharesCount = 1

			# if the lot is different than the current lot,
			# add the current lot to lots then then save this row's information
			elif lot["lotId"] != row[7]:
				lotProfit = len(shares) * (sellPrice - buyPrice)
				sellLotProfit += lotProfit
				lot.update({ "profit" : round(lotProfit, 2), "shares" : len(shares), "shareIds" : shares })
				lots.append(lot)
				buyPrice = round(float(row[3]), 2)
				buyDate = row[4]
				lot = { "lotId" : int(row[7]), "buyPrice": buyPrice, "buyDate": buyDate }
				shares = [int(row[2])]
				sellLotSharesCount += 1

			# otherwise, add this share to shares
			else:
				shares.append(int(row[2]))
				sellLotSharesCount += 1

		if symbol is not None:
			lotProfit = len(shares) * (sellPrice - buyPrice)
			sellLotProfit += lotProfit
			totalProfit += sellLotProfit
			totalWithdrawn += sellLotSharesCount * sellPrice
			lot.update({ "profit" : round(lotProfit, 2), "shares" : len(shares), "shareIds" : shares })
			lots.append(lot)
			sellLots.append({ "sellLotId" : sellLot, "symbol" : symbol,  "sellPrice" : sellPrice, "sellDate" : sellDate, "profit" : round(sellLotProfit, 2), "sharesSold" : sellLotSharesCount, "lots" : lots })

		if params["sellLotId"] is not None:
			return Response(json.dumps(sellLots[0]), status=HTTP_OK, mimetype="application/json")
		return Response(json.dumps({ "id" : int(params["id"]), "totalWithdrawn" : round(totalWithdrawn, 2), "totalProfit" : round(totalProfit, 2), "sellLots" : sellLots }), status=HTTP_OK, mimetype="application/json")


	# add a new sell lot for a user
	#
	# param : "id" the user's id (required)
	# param : "password" the user's password (required)
	# param : "symbol" the symbol of the shares sold (*)
	# param : "shares" the number of shares sold (*)
	# param : "shareId" the date the lot was sold (**)
	# param : "sellPrice" the price at which the shares were sold (required)
	# param : "sellDate" the date the lot was sold (required)
	#
	# Either all params marked (*) or all params marked (**) required
	def post(self):
		parser = reqparse.RequestParser()
		parser.add_argument("id")
		parser.add_argument("password")
		parser.add_argument("symbol")
		parser.add_argument("shares")
		parser.add_argument("shareId")
		parser.add_argument("sellPrice")
		parser.add_argument("sellDate")
		params = parser.parse_args()

		if params["id"] is None:
			return Response(json.dumps({ "error" : MISSING_ID_PARAM, "message" : "'id' parameter required" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if params["password"] is None:
			return Response(json.dumps({ "error" : MISSING_PASSWORD_PARAM, "message" : "'password' parameter required" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if params["sellPrice"] is None:
			return Response(json.dumps({ "error" : MISSING_SELL_PRICE_PARAM, "message" : "'sellPrice' parameter required" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if params["sellDate"] is None:
			return Response(json.dumps({ "error" : MISSING_SELL_DATE_PARAM, "message" : "'sellDate' parameter required" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if (params["symbol"] is None or params["shares"] is None) and params["shareId"] is None:
			return Response(json.dumps({ "error" : MISSING_REQUIRED_PARAMS, "message" : "'symbol' and 'shares' or 'shareId' parameter(s) required" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if not checkDollarFormat(params["sellPrice"]):
			return Response(json.dumps({ "error" : INVALID_SELL_PRICE_PARAM, "message" : "Invalid sell price" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if not checkDateFormat(params["sellDate"]):
			return Response(json.dumps({ "error" : INVALID_SELL_DATE_PARAM, "message" : "Invalid sell date" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if not checkIntFormat(params["id"]):
			return Response(json.dumps({ "error" : AUTHENTICATION_FAILED, "message" : "Id and password do not match" }), status=HTTP_FORBIDDEN, mimetype="application/json")

		if not checkPasswordFormat(params["password"]):
			return Response(json.dumps({ "error" : AUTHENTICATION_FAILED, "message" : "Id and password do not match" }), status=HTTP_FORBIDDEN, mimetype="application/json")

		if not matchIdAndPassword(params["id"], params["password"]):
			return Response(json.dumps({ "error" : AUTHENTICATION_FAILED, "message" : "Id and password do not match" }), status=HTTP_FORBIDDEN, mimetype="application/json")

		if params["shareId"] is not None:
			if not shareHeldByUser(params["shareId"], params["id"]):
				return Response(json.dumps({ "error" : OWNERSHIP_AUTHENTICATION_FAILED, "message" : "User is not holding this share" }), status=HTTP_FORBIDDEN, mimetype="application/json")
			sellLotId = createSellLotId()
			statement = "UPDATE Holdings SET SellLotID = {}, SellPrice = {}, SellDate = '{}' WHERE ShareID = {};".format(sellLotId, params["sellPrice"], params["sellDate"], params["shareId"])
			sell = executeDatabaseUpdate(statement)
			if sell.rowcount == 0:
				return Response(json.dumps({ "message" : "Internal Server Error" }), status=HTTP_INTERNAL_SERVER_ERROR, mimetype="application/json")
			return Response(json.dumps({ "sellLotId" : sellLotId, "shareId" : int(params["shareId"]) }), status=HTTP_OK, mimetype="application/json")

		if not symbolExists(params["symbol"]):
			return Response(json.dumps({ "error" : INVALID_SYMBOL_PARAM, "message" : "Invalid symbol" }), status=HTTP_BAD_REQUEST, mimetype="application/json")
		if not checkIntFormat(params["shares"]) or int(params["shares"]) <= 0:
			return Response(json.dumps({ "error" : INVALID_SHARES_PARAM, "message" : "Invalid amount of shares" }), status=HTTP_BAD_REQUEST, mimetype="application/json")
		query = "SELECT COUNT(*) FROM Holdings WHERE User = {} AND Symbol = '{}' AND SellLotID IS NULL;".format(params["id"], params["symbol"].upper())
		result = executeDatabaseQuery(query)
		if result[0][0] < int(params["shares"]):
			return Response(json.dumps({ "error" : BOUGHT_SOLD_DISCREPANCY, "message" : "Selling {} shares would result in more shares being sold than bought".format(params["shares"]) }), status=HTTP_CONFLICT, mimetype="application/json")
		sellLotId = createSellLotId()

		query = "SELECT ShareID, BuyPrice FROM Holdings WHERE User = {} AND Symbol = '{}' AND SellLotID IS NULL ORDER BY BuyPrice ASC, LotID LIMIT {};".format(params["id"], params["symbol"].upper(), params["shares"])
		result = executeDatabaseQuery(query)
		shares = []
		shareFilter = ""
		profit = 0.0
		for row in result:
			shares.append(int(row[0]))
			shareFilter += " OR ShareId = {}".format(row[0])
			profit += float(params["sellPrice"]) - float(row[1])

		statement = "UPDATE Holdings SET SellLotID = {}, SellPrice = {}, SellDate = '{}' WHERE {};".format(sellLotId, params["sellPrice"], params["sellDate"], shareFilter[4:])
		update = executeDatabaseUpdate(statement)
		if update.rowcount == 0:
			return Response(json.dumps({ "message" : "Internal Server Error" }), status=HTTP_INTERNAL_SERVER_ERROR, mimetype="application/json")
		return Response(json.dumps({ "sellLotId" : sellLotId, "profit" : round(profit, 2), "shares" : len(shares), "shareIds" : shares }), status=HTTP_OK, mimetype="application/json")


	# edit a sell lot's information
	#
	# param : "id" the user's id (required)
	# param : "password" the user's password (required)
	# param : "sellLotId" the sell lot to be edited (required)
	# param : "shares" the new number of shares sold (*)
	# param : "sellPrice" the new price at which the shares were sold (*)
	# param : "sellDate" the new date at which the lot was sold (*)
	#
	# (*) at least one of these parameters is required
	def patch(self):
		parser = reqparse.RequestParser()
		parser.add_argument("id")
		parser.add_argument("password")
		parser.add_argument("sellLotId")
		parser.add_argument("shares")
		parser.add_argument("sellPrice")
		parser.add_argument("sellDate")
		params = parser.parse_args()

		if params["id"] is None:
			return Response(json.dumps({ "error": MISSING_ID_PARAM, "message" : "'id' parameter required" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if params["password"] is None:
			return Response(json.dumps({ "error": MISSING_PASSWORD_PARAM, "message" : "'password' parameter required" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if params["sellLotId"] is None:
			return Response(json.dumps({ "error": MISSING_SELL_LOT_PARAM, "message" : "'sellLotId' parameter required" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if params["shares"] is None and params["sellPrice"] is None and params["sellDate"] is None:
			return Response(json.dumps({ "error": MISSING_REQUIRED_PARAMS, "message" : "'shares' and/or 'sellPrice' and/or 'sellDate' parameter(s) required" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if not checkIntFormat(params["id"]):
			return Response(json.dumps({ "error": AUTHENTICATION_FAILED, "message" : "Id and password do not match" }), status=HTTP_FORBIDDEN, mimetype="application/json")

		if not checkPasswordFormat(params["password"]):
			return Response(json.dumps({ "error": AUTHENTICATION_FAILED, "message" : "Id and password do not match" }), status=HTTP_FORBIDDEN, mimetype="application/json")

		if not matchIdAndPassword(params["id"], params["password"]):
			return Response(json.dumps({ "error": AUTHENTICATION_FAILED, "message" : "Id and password do not match" }), status=HTTP_FORBIDDEN, mimetype="application/json")

		if not lotSoldByUser(params["sellLotId"], params["id"]):
			return Response(json.dumps({ "error": OWNERSHIP_AUTHENTICATION_FAILED, "message" : "User has not sold this lot" }), status=HTTP_FORBIDDEN, mimetype="application/json")

		infoChanges = ""
		if params["sellPrice"] is not None:
			if not checkDollarFormat(params["sellPrice"]):
				return Response(json.dumps({ "error": INVALID_SELL_PRICE_PARAM, "message" : "Invalid sell price" }), status=HTTP_BAD_REQUEST, mimetype="application/json")
			infoChanges += ", SellPrice = {}".format(params["sellPrice"])

		if params["sellDate"] is not None:
			if not checkDateFormat(params["sellDate"]):
				return Response(json.dumps({ "error": INVALID_SELL_DATE_PARAM, "message" : "Invalid sell date" }), status=HTTP_BAD_REQUEST, mimetype="application/json")
			infoChanges += ", SellDate = '{}'".format(params["sellDate"])

		if params["shares"] is not None:
			if not checkIntFormat(params["shares"]) or int(params["shares"]) <= 0:
				return Response(json.dumps({ "error": INVALID_SHARES_PARAM, "message" : "Invalid amount of shares" }), status=HTTP_BAD_REQUEST, mimetype="application/json")
			query = "SELECT COUNT(*), Symbol, SellPrice, SellDate FROM Holdings WHERE SellLotID = {};".format(params["sellLotId"])
			result = executeDatabaseQuery(query)
			currentShares = int(result[0][0])
			symbol = result[0][1]
			sellPrice = round(float(result[0][2]), 2)
			sellDate = result[0][3]

			# decrease number of shares sold in this lot
			if currentShares > int(params["shares"]):
				remove = int(currentShares) - int(params["shares"])

				query = "SELECT ShareID FROM Holdings WHERE SellLotID = {} ORDER BY BuyPrice DESC LIMIT {}".format(params["sellLotId"], remove)
				result = executeDatabaseQuery(query)
				shares = []
				shareFilter = ""
				for row in result:
					shares.append(int(row[0]))
					shareFilter += " OR ShareId = {}".format(row[0])

				statement = "UPDATE Holdings SET SellLotID = NULL, SellPrice = NULL, SellDate = NULL WHERE {};".format(shareFilter[4:])
				update = executeDatabaseUpdate(statement)
				if update.rowcount == 0:
					return Response(json.dumps({ "message" : "Internal Server error" }), status=HTTP_INTERNAL_SERVER_ERROR, mimetype="application/json")

			# increase number of shares sold in this lot
			elif currentShares < int(params["shares"]):
				add = int(params["shares"]) - int(currentShares)
				query = "SELECT COUNT(*) FROM Holdings WHERE User = {} AND Symbol = '{}' AND SellLotID IS NULL;".format(params["id"], symbol)
				result = executeDatabaseQuery(query)
				otherHoldings = int(result[0][0])

				# if there aren't enough shares of this symbol in holdings to accommodate this change, throw an error
				if otherHoldings < add:
					return Response(json.dumps({ "error": BOUGHT_SOLD_DISCREPANCY, "message" : "Increasing the shares sold in this lot to {} would result in more shares being sold than bought".format(params["shares"]) }), status=HTTP_CONFLICT, mimetype="application/json")

				query = "SELECT ShareID FROM Holdings WHERE User = {} AND Symbol = '{}' AND SellLotID IS NULL ORDER BY BuyPrice ASC, LotID LIMIT {};".format(params["id"], symbol, add)
				result = executeDatabaseQuery(query)
				shares = []
				shareFilter = ""
				for row in result:
					shares.append(int(row[0]))
					shareFilter += " OR ShareId = {}".format(row[0])

				statement = "UPDATE Holdings SET SellLotID = {}, SellPrice = {}, SellDate = '{}' WHERE {};".format(params["sellLotId"], sellPrice, sellDate, shareFilter[4:])
				update = executeDatabaseUpdate(statement)
				if update.rowcount == 0:
					return Response(json.dumps({ "message" : "Internal Server Error" }), status=HTTP_INTERNAL_SERVER_ERROR, mimetype="application/json")

		if infoChanges != "":
			statement = "UPDATE Holdings SET {} WHERE SellLotID = {};".format(infoChanges[2:], params["sellLotId"])
			update = executeDatabaseUpdate(statement)
			if update.rowcount == 0:
				return Response(json.dumps({ "message" : "Internal Server Error" }), status=HTTP_INTERNAL_SERVER_ERROR, mimetype="application/json")

		query = "SELECT ShareID FROM Holdings WHERE SellLotID = {};".format(params["sellLotId"])
		result = executeDatabaseQuery(query)
		shareIds = []
		for row in result:
			shareIds.append(int(row[0]))

		query = "SELECT Symbol, SellPrice, SellDate FROM Holdings WHERE SellLotID = {};".format(params["sellLotId"])
		result = executeDatabaseQuery(query)
		return Response(json.dumps({ "user" : int(params["id"]), "symbol" : result[0][0], "shares" : len(shareIds), "sellPrice" : float(result[0][1]), "sellDate" : result[0][2], "sellLotId" : params["sellLotId"], "shareIds" : shareIds }), status=HTTP_OK, mimetype="application/json")


	# remove a sell lot and its data
	#
	# param : "id" the user's id (required)
	# param : "password" the user's password (required)
	# param : "sellLotId" the sell lot to be removed (required)
	def delete(self):
		parser = reqparse.RequestParser()
		parser.add_argument("id")
		parser.add_argument("password")
		parser.add_argument("sellLotId")
		params = parser.parse_args()

		if params["id"] is None:
			return Response(json.dumps({ "error" : MISSING_ID_PARAM, "message" : "'id' parameter required" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if params["password"] is None:
			return Response(json.dumps({ "error" : MISSING_PASSWORD_PARAM, "message" : "'password' parameter required" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if params["sellLotId"] is None:
			return Response(json.dumps({ "error" : MISSING_SELL_LOT_ID_PARAM, "message" : "'sellLotId' parameter required" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if not checkIntFormat(params["id"]):
			return Response(json.dumps({ "error" : AUTHENTICATION_FAILED, "message" : "Id and password do not match" }), status=HTTP_FORBIDDEN, mimetype="application/json")

		if not checkPasswordFormat(params["password"]):
			return Response(json.dumps({ "error" : AUTHENTICATION_FAILED, "message" : "Id and password do not match" }), status=HTTP_FORBIDDEN, mimetype="application/json")

		if not matchIdAndPassword(params["id"], params["password"]):
			return Response(json.dumps({ "error" : AUTHENTICATION_FAILED, "message" : "Id and password do not match" }), status=HTTP_FORBIDDEN, mimetype="application/json")

		if not lotSoldByUser(params["sellLotId"], params["id"]):
			return Response(json.dumps({ "error" : OWNERSHIP_AUTHENTICATION_FAILED, "message" : "User has not sold this lot" }), status=HTTP_FORBIDDEN, mimetype="application/json")

		statement = "UPDATE Holdings SET SellLotID = NULL, SellPrice = NULL, SellDate = NULL WHERE SellLotID = {};".format(params["sellLotId"])
		update = executeDatabaseUpdate(statement)
		if update.rowcount == 0:
			return Response(json.dumps({ "message" : "Internal Server Error" }), status=HTTP_INTERNAL_SERVER_ERROR, mimetype="application/json")
		return Response(json.dumps({ "sellLotId" : int(params["sellLotId"]) }), status=HTTP_OK, mimetype="application/json")


# /myshare/user/password-reset/validate
class ValidateResetCode(Resource):
	def get(self):
		parser = reqparse.RequestParser()
		parser.add_argument("username")
		parser.add_argument("resetCode")
		params = parser.parse_args()

		if params["username"] is None:
			return Response(json.dumps({ "error" : MISSING_USERNAME_PARAM, "message" : "'username' parameter required" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if params["resetCode"] is None:
			return Response(json.dumps({ "error" : MISSING_RESET_CODE_PARAM, "message" : "'resetCode' parameter required" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if not checkUsernameFormat(params["username"]) or usernameAvailable(params["username"]):
			return Response(json.dumps({ "error" : AUTHENTICATION_FAILED, "message" : "Username and reset code do not match" }), status=HTTP_FORBIDDEN, mimetype="application/json")

		statement = "DELETE FROM PasswordReset WHERE (Cast((JulianDay('now', 'localtime') - JulianDay(Created, 'localtime')) * 24 * 60 AS INTEGER)) > 5;"
		executeDatabaseUpdate(statement)

		query = "SELECT ID FROM Users WHERE Username = '{}';".format(params["username"])
		result = executeDatabaseQuery(query)
		id = result[0][0]

		query = "SELECT ResetCode, Attempts FROM PasswordReset WHERE User = {};".format(id)
		result = executeDatabaseQuery(query)
		if result == []:
			return Response(json.dumps({ "error" : AUTHENTICATION_FAILED, "message" : "Username and reset code do not match" }), status=HTTP_FORBIDDEN, mimetype="application/json")

		if int(result[0][1]) >= 5:
			return Response(json.dumps({ "error" : TOO_MANY_AUTHENTICATION_ATTEMPTS, "message" : "Too many attempts" }), status=HTTP_FORBIDDEN, mimetype="application/json")

		if result[0][0] == params["resetCode"].upper():
			return Response(json.dumps({ "id" : id }), status=HTTP_OK, mimetype="application/json")

		statement = "UPDATE PasswordReset SET Attempts = Attempts + 1 WHERE User = {};".format(id)
		executeDatabaseUpdate(statement)
		return Response(json.dumps({ "error" : AUTHENTICATION_FAILED, "message" : "Username and reset code do not match" }), status=HTTP_FORBIDDEN, mimetype="application/json")


# /myshare/user/password-reset
class PasswordReset(Resource):

	# email a user a password reset code
	#
	# param : "email" the user's email (required)
	def get(self):
		parser = reqparse.RequestParser()
		parser.add_argument("email")
		params = parser.parse_args()

		if params["email"] is None:
			return Response(json.dumps({ "error" : MISSING_EMAIL_PARAM, "message" : "'email' parameter required" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if not checkEmailFormat(params["email"]):
			return Response(json.dumps({ "error" : AUTHENTICATION_FAILED, "message" : "Email not registered to any user" }), status=HTTP_FORBIDDEN, mimetype="application/json")

		query = "SELECT ID, FirstName, Username FROM Users WHERE Email = '{}';".format(params["email"])
		result = executeDatabaseQuery(query)
		if result == []:
			return Response(json.dumps({ "error" : AUTHENTICATION_FAILED, "message" : "Email not registered to any user" }), status=HTTP_FORBIDDEN, mimetype="application/json")

		resetCode = str(secrets.token_hex(4)).upper()

		update = "INSERT INTO PasswordReset (User, ResetCode) VALUES ({}, '{}');".format(result[0][0], resetCode)
		insert = executeDatabaseUpdate(update)
		if insert.rowcount == 0:
			return Response(json.dumps({ "message" : "Internal Server Error" }), status=HTTP_INTERNAL_SERVER_ERROR, mimetype="application/json")

		yag_smtp_connection = yagmail.SMTP(user=ADMIN_EMAIL_ADDRESS, password=ADMIN_EMAIL_PASSWORD, host='smtp.gmail.com')
		subject = "MyShare Password Recovery"
		contents = [createPasswordResetEmail(result[0][1], result[0][2], resetCode)]
		try:
			yag_smtp_connection.send(params["email"], subject, contents)
		except:
			return Response(json.dumps({ "message" : "Internal Server Error" }), status=HTTP_INTERNAL_SERVER_ERROR, mimetype="application/json")
		return Response(json.dumps({ "email" : params["email"] }), status=HTTP_OK, mimetype="application/json")


	# reset a users password using a code sent to their email
	#
	# param : "id" the user's id (required)
	# param : "resetCode" the reset code sent to the user's email (required)
	# param : "newPassword" the user's new password (required)
	def post(self):
		parser = reqparse.RequestParser()
		parser.add_argument("id")
		parser.add_argument("resetCode")
		parser.add_argument("newPassword")
		params = parser.parse_args()

		if params["id"] is None:
			return Response(json.dumps({ "error" : MISSING_ID_PARAM, "message" : "'id' parameter required" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if params["resetCode"] is None:
			return Response(json.dumps({ "error" : MISSING_RESET_CODE_PARAM, "message" : "'resetCode' parameter required" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if params["newPassword"] is None:
			return Response(json.dumps({ "error" : MISSING_NEW_PASSWORD_PARAM, "message" : "'newPassword' parameter required" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		if not checkPasswordFormat(params["newPassword"]):
			return Response(json.dumps({ "error" : INVALID_NEW_PASSWORD_PARAM, "message" : "Invalid new password" }), status=HTTP_BAD_REQUEST, mimetype="application/json")

		statement = "DELETE FROM PasswordReset WHERE (Cast((JulianDay('now', 'localtime') - JulianDay(Created, 'localtime')) * 24 * 60 AS INTEGER)) > 5;"
		executeDatabaseUpdate(statement)

		query = "SELECT ResetCode, Attempts FROM PasswordReset WHERE User = {};".format(params["id"])
		result = executeDatabaseQuery(query)
		if result == []:
			return Response(json.dumps({ "error" : AUTHENTICATION_FAILED, "message" : "Id and reset code do not match" }), status=HTTP_FORBIDDEN, mimetype="application/json")

		if int(result[0][1]) >= 5:
			return Response(json.dumps({ "error" : TOO_MANY_AUTHENTICATION_ATTEMPTS, "message" : "Too many attempts" }), status=HTTP_FORBIDDEN, mimetype="application/json")

		if result[0][0] == params["resetCode"].upper():
			statement = "DELETE FROM PasswordReset WHERE User = {};".format(params["id"])
			executeDatabaseUpdate(statement)
			password = sha256_crypt.encrypt(params["newPassword"])
			statement = "UPDATE Users SET Password = '{}' WHERE ID = {};".format(password, params["id"])
			update = executeDatabaseUpdate(statement)
			if update.rowcount == 0:
				return Response(json.dumps({ "message" : "Internal Server Error" }), status=HTTP_INTERNAL_SERVER_ERROR, mimetype="application/json")
			return Response(json.dumps({ "id" : params["id"] }), status=HTTP_OK, mimetype="application/json")

		statement = "UPDATE PasswordReset SET Attempts = Attempts + 1 WHERE User = {};".format(id)
		executeDatabaseUpdate(statement)
		return Response(json.dumps({ "error" : AUTHENTICATION_FAILED, "message" : "Id and reset code do not match" }), status=HTTP_FORBIDDEN, mimetype="application/json")

# /myshare/symbol
class SymbolPage(Resource):
	def get(self):
		return Response(render_template("symbol.html"), status=HTTP_OK, mimetype="text/html")

# /myshare/home
class HomePage(Resource):
	def get(self):
		return Response(render_template("home.html"), status=HTTP_OK, mimetype="text/html")

# /myshare/login
class LoginPage(Resource):
	def get(self):
		return Response(render_template("login.html"), status=HTTP_OK, mimetype="text/html")

# /myshare/register
class RegisterPage(Resource):
	def get(self):
		return Response(render_template("register.html"), status=HTTP_OK, mimetype="text/html")

# /myshare/recover-password
class RecoverPasswordPage(Resource):
	def get(self):
		return Response(render_template("recover-password.html"), status=HTTP_OK, mimetype="text/html")

# /myshare/reset-password
class ResetPasswordPage(Resource):
	def get(self):
		return Response(render_template("reset-password.html"), status=HTTP_OK, mimetype="text/html")

# /myshare/account-settings
class AccountSettingsPage(Resource):
	def get(self):
		return Response(render_template("account-settings.html"), status=HTTP_OK, mimetype="text/html")

# /myshare/change-password
class ChangePasswordPage(Resource):
	def get(self):
		return Response(render_template("change-password.html"), status=HTTP_OK, mimetype="text/html")

# /myshare/delete-account
class DeleteAccountPage(Resource):
	def get(self):
		return Response(render_template("delete-account.html"), status=HTTP_OK, mimetype="text/html")

# /myshare/holdings
class HoldingsPage(Resource):
	def get(self):
		return Response(render_template("holdings.html"), status=HTTP_OK, mimetype="text/html")

# /myshare/lots
class LotsPage(Resource):
	def get(self):
		return Response(render_template("lots.html"), status=HTTP_OK, mimetype="text/html")

# /myshare/sell-lots
class SellLotsPage(Resource):
	def get(self):
		return Response(render_template("sell-lots.html"), status=HTTP_OK, mimetype="text/html")

# /myshare/lot
class LotPage(Resource):
	def get(self):
		return Response(render_template("lot.html"), status=HTTP_OK, mimetype="text/html")

# /myshare/sell-lot
class SellLotPage(Resource):
	def get(self):
		return Response(render_template("sell-lot.html"), status=HTTP_OK, mimetype="text/html")

# /myshare/new-lot
class NewLotPage(Resource):
	def get(self):
		return Response(render_template("new-lot.html"), status=HTTP_OK, mimetype="text/html")

# /myshare/new-sell-lot
class NewSellLotPage(Resource):
	def get(self):
		return Response(render_template("new-sell-lot.html"), status=HTTP_OK, mimetype="text/html")

# /myshare/edit-lot
class EditLotPage(Resource):
	def get(self):
		return Response(render_template("edit-lot.html"), status=HTTP_OK, mimetype="text/html")

# /myshare/edit-sell-lot
class EditSellLotPage(Resource):
	def get(self):
		return Response(render_template("edit-sell-lot.html"), status=HTTP_OK, mimetype="text/html")

# /myshare/delete-lot
class DeleteLotPage(Resource):
	def get(self):
		return Response(render_template("delete-lot.html"), status=HTTP_OK, mimetype="text/html")

# /myshare/edit-sell-lot
class DeleteSellLotPage(Resource):
	def get(self):
		return Response(render_template("delete-sell-lot.html"), status=HTTP_OK, mimetype="text/html")



app = Flask(__name__)
myShare = Api(app)

# API endpoints
myShare.add_resource(Info, "/myshare/info")
myShare.add_resource(Price, "/myshare/info/price")
myShare.add_resource(User, "/myshare/user")
myShare.add_resource(ID, "/myshare/user/id")
myShare.add_resource(Holdings, "/myshare/user/holdings")
myShare.add_resource(Lots, "/myshare/user/lots")
myShare.add_resource(SellLots, "/myshare/user/sell-lots")
myShare.add_resource(ValidateResetCode, "/myshare/user/password-reset/validate")
myShare.add_resource(PasswordReset, "/myshare/user/password-reset")

# pages
myShare.add_resource(SymbolPage, "/myshare/symbol")
myShare.add_resource(HomePage, "/myshare/home")
myShare.add_resource(LoginPage, "/myshare/login")
myShare.add_resource(RegisterPage, "/myshare/register")
myShare.add_resource(RecoverPasswordPage, "/myshare/recover-password")
myShare.add_resource(ResetPasswordPage, "/myshare/reset-password")
myShare.add_resource(AccountSettingsPage, "/myshare/account-settings")
myShare.add_resource(ChangePasswordPage, "/myshare/change-password")
myShare.add_resource(DeleteAccountPage, "/myshare/delete-account")
myShare.add_resource(HoldingsPage, "/myshare/holdings")
myShare.add_resource(LotsPage, "/myshare/lots")
myShare.add_resource(SellLotsPage, "/myshare/sell-lots")
myShare.add_resource(LotPage, "/myshare/lot")
myShare.add_resource(SellLotPage, "/myshare/sell-lot")
myShare.add_resource(NewLotPage, "/myshare/new-lot")
myShare.add_resource(NewSellLotPage, "/myshare/new-sell-lot")
myShare.add_resource(EditLotPage, "/myshare/edit-lot")
myShare.add_resource(EditSellLotPage, "/myshare/edit-sell-lot")
myShare.add_resource(DeleteLotPage, "/myshare/delete-lot")
myShare.add_resource(DeleteSellLotPage, "/myshare/delete-sell-lot")

if __name__ == '__main__':
	app.run(port=1817)
