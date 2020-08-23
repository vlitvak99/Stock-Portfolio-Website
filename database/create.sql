/**
*
* @author Vlad Litvak
* @since 08.04.2020
* @version 3.2
*
*/

PRAGMA foreign_keys = ON;

-- Passwords should be encrypted using python passlib.hash.sha256_crypt before being put into this table
CREATE TABLE IF NOT EXISTS Users (
  ID INTEGER PRIMARY KEY,
  Username VARCHAR(25) NOT NULL UNIQUE CHECK (length(Username) > 5 AND length(Username) <= 25),
  Password VARCHAR(100) NOT NULL,
  Email VARCHAR(100) NOT NULL UNIQUE CHECK (length(Email) <= 100 AND Email LIKE '%_@__%.__%'),
  FirstName VARCHAR(25) NOT NULL CHECK (length(FirstName) > 0 AND length(FirstName) <= 25),
  LastName VARCHAR(25) NOT NULL CHECK (length(LastName) > 0 AND length(LastName) <= 25)
);

CREATE UNIQUE INDEX IF NOT EXISTS Users_Username ON Users(Username);
CREATE UNIQUE INDEX IF NOT EXISTS Users_Email ON Users(Email);



CREATE TABLE IF NOT EXISTS Holdings (
  ShareID INTEGER PRIMARY KEY,
  LotID INTEGER NOT NULL,
  User INTEGER REFERENCES Users(ID) ON DELETE CASCADE,
  Symbol VARCHAR(5) NOT NULL CHECK (length(Symbol) > 0 AND length(Symbol) <= 5),
  BuyPrice DECIMAL(9, 2) NOT NULL,
  BuyDate DATE NOT NULL,
  SellLotID INTEGER DEFAULT NULL,
  SellPrice DECIMAL(9, 2) DEFAULT NULL,
  SellDate DATE DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS Holdings_User_Symbol ON Holdings(User, Symbol);
CREATE INDEX IF NOT EXISTS Holdings_User_BuyDate_LotID_SellLotID ON Holdings(User, BuyDate, LotID, SellLotID);
CREATE INDEX IF NOT EXISTS Holdings_LotID ON Holdings(LotID);
CREATE INDEX IF NOT EXISTS Holdings_SellLotID ON Holdings(SellLotID);



CREATE TABLE IF NOT EXISTS PasswordReset (
  User INTEGER REFERENCES Users(ID) ON DELETE CASCADE,
  ResetCode CHAR(8) NOT NULL,
  Created DATETIME DEFAULT CURRENT_TIMESTAMP,
  Attempts INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS PasswordReset_User ON PasswordReset(User);

-- Delete a user's previous password reset code if there is one, and delete all reset codes more than 5 minutes old
CREATE TRIGGER IF NOT EXISTS Remove_Old_Codes BEFORE INSERT ON PasswordReset
BEGIN
  DELETE FROM PasswordReset WHERE (Cast((JulianDay('now', 'localtime') - JulianDay(Created, 'localtime')) * 24 * 60 AS INTEGER)) > 5 OR User = NEW.User;
END;
