-- Additive compatibility migration for the security checks already present in StormPT.
-- Existing tables and rows are never replaced or removed.
USE [SecurityDB];
SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF OBJECT_ID(N'dbo.BannedIP',N'U') IS NULL
BEGIN
 CREATE TABLE dbo.BannedIP (
  Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_StormPT_BannedIP PRIMARY KEY,
  IP varchar(45) NOT NULL,
  AccountID varchar(32) NOT NULL,
  BannedAt datetime NOT NULL
 );
 CREATE INDEX IX_StormPT_BannedIP_IP ON dbo.BannedIP(IP);
END;
IF OBJECT_ID(N'dbo.BannedMac',N'U') IS NULL
BEGIN
 CREATE TABLE dbo.BannedMac (
  Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_StormPT_BannedMac PRIMARY KEY,
  MacAddress varchar(64) NOT NULL,
  AccountID varchar(32) NOT NULL,
  BannedAt datetime NOT NULL
 );
 CREATE INDEX IX_StormPT_BannedMac_Address ON dbo.BannedMac(MacAddress);
END;
COMMIT;
