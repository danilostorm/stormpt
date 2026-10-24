// Included by record.cpp: native browser creation uses original record types.
// Pilot initially supports the original level-1 Fighter preset only.
#include <mutex>
#include <cstddef>
static bool WebWriteNewFile(const char* path, const void* data, DWORD size) {
    HANDLE h=CreateFileA(path,GENERIC_WRITE,0,nullptr,CREATE_NEW,FILE_ATTRIBUTE_NORMAL|FILE_FLAG_WRITE_THROUGH,nullptr);
    if(h==INVALID_HANDLE_VALUE) return false;
    DWORD written=0;
    bool ok=WriteFile(h,data,size,&written,nullptr) && written==size && FlushFileBuffers(h);
    CloseHandle(h);
    return ok; // On error retain the file for recovery; never delete character data.
}
int rsRECORD_DBASE::InsertWebCharData(const char* account, char* name, int job) {
    static std::mutex creationMutex;
    std::lock_guard<std::mutex> lock(creationMutex);
    if(!account || !name || job!=1) return FALSE;
    size_t n=strnlen(name,32);
    if(n<3 || n>16) return FALSE;
    for(size_t i=0;i<n;++i)
        if(!((name[i]>='A'&&name[i]<='Z')||(name[i]>='a'&&name[i]<='z')||
             (i>0&&name[i]>='0'&&name[i]<='9'))) return FALSE;
    if(IsData(name)==TRUE) return FALSE;
    char infoPath[256], recordPath[256], tempPath[280], backupPath[280];
    GetUserInfoFile(account,infoPath);
    GetUserDataFile(name,recordPath);
    sprintf_s(tempPath,"%s.web-new",infoPath);
    sprintf_s(backupPath,"%s.web-before",infoPath);
    sPLAY_USER_DATA users={};
    FILE* fp=fopen(infoPath,"rb");
    if(!fp) return FALSE;
    bool ok=fread(&users,sizeof(users),1,fp)==1;
    fclose(fp);
    if(!ok || !memchr(users.szID,0,sizeof(users.szID)) || strcmp(users.szID,account)!=0 ||
       strncmp(users.szHeader,"PS_TAILID 1.10",13)!=0) return FALSE;
    int slot=-1,count=0;
    for(int i=0;i<sPLAY_CHAR_MAX;++i) {
        if(users.szCharName[i][0]) ++count;
        else if(slot<0) slot=i;
    }
    if(slot<0 || count>=5) return FALSE;
    ZeroMemory(&TransRecordData,sizeof(TransRecordData));
    auto& c=TransRecordData.smCharInfo;
    strcpy_s(c.szName,name);
    strcpy_s(c.szModelName,"char\\tmABCD\\b001.ini");
    strcpy_s(c.szModelName2,"char\\tmABCD\\tmh-b01.inf");
    c.JOB_CODE=1; c.Level=1; c.State=smCHAR_STATE_USER; c.SizeLevel=1;
    // HoLogin.cpp TempNewCharacterInit: original Fighter, no progression/quest grants.
    c.Strength=28; c.Spirit=6; c.Talent=21; c.Dexterity=17; c.Health=27;
    const JOB_DATA_CODE* base=nullptr;
    for(int i=0;JobDataBase[i].JobCode;++i)
        if(JobDataBase[i].JobCode==1) {base=&JobDataBase[i];break;}
    if(!base) return FALSE;
    c.Brood=base->Brood; c.JobBitMask=base->JobBitCode; c.Sight=base->Sight;
    c.LifeFunction=base->LifeFunction; c.ManaFunction=base->ManaFunction;
    c.StaminaFunction=base->StaminaFunction;
    c.DamageFunction[0]=base->DamageFunction[0]; c.DamageFunction[1]=base->DamageFunction[1];
    c.Attack_Damage[0]=5; c.Attack_Damage[1]=10; c.Attack_Rating=100;
    c.Move_Speed=1;
    // Original sinInvenTory.cpp naked level-1 Fighter formulas.
    c.Weight[1]=(short)(c.Strength*2+c.Health*1.5+c.Level*3+60);
    c.Life[0]=c.Life[1]=(short)(c.Level*2.1+c.Health*2.4+c.Strength*0.8-10);
    c.Mana[0]=c.Mana[1]=(short)(c.Level*0.6f+c.Spirit*2.2f);
    c.Stamina[0]=c.Stamina[1]=(short)(c.Health*1.4+(c.Strength+c.Talent)/2.0+c.Level*2.3+80+c.Spirit);
    c.Next_Exp=(int)GetNextExp(1);
    c.wVersion[0]=(WORD)Version_CharInfo;
    ReformCharStatePoint(&c,0);
    ReformCharForm(&c);
    strcpy_s(TransRecordData.szHeader,szRecordHeader);
    auto& save=TransRecordData.GameSaveInfo;
    save.Head=dwRecordVersion;
    save.PlayStageNum=rsServerConfig.FixedStartField ? rsServerConfig.FixedStartField : START_FIELD_NUM;
    if(save.PlayStageNum<0 || save.PlayStageNum>=FIELD_MAX) return FALSE;
    sField[save.PlayStageNum].GetStartPoint(0,0,&save.PosX,&save.PosZ);
    save.SaveTime=(int)tServerTime;
    strcpy_s(save.szMasterID,account);
    save.dwChkSum_CharInfo=GetCharInfoCode(&c);
    TransRecordData.code=OpCode::OPCODE_RECORDDATA;
    TransRecordData.size=(int)offsetof(TRANS_RECORD_DATA,Data);
    static_assert(sizeof(smTRANS_CHAR_COMMAND2)==76,"Browser creation ABI");
    // Back up the account association before its first web mutation.
    if(!CopyFileA(infoPath,backupPath,TRUE) && GetLastError()!=ERROR_FILE_EXISTS) return FALSE;
    if(!WebWriteNewFile(recordPath,&TransRecordData,
         max((DWORD)TransRecordData.size,(DWORD)srRECORD_DEFAULT_SIZE))) return FALSE;
    strcpy_s(users.szCharName[slot],name);
    if(!WebWriteNewFile(tempPath,&users,sizeof(users))) return FALSE;
    // Complete record first, then atomic association replacement on the same volume.
    if(!MoveFileExA(tempPath,infoPath,MOVEFILE_REPLACE_EXISTING|MOVEFILE_WRITE_THROUGH)) return FALSE;
    return TRUE;
}
