#include "PacketFilter.h"
#include "record.h"
#include <cstdio>
#include <cstddef>
int main(){
printf("{\"pointer\":%u,\"smCharInfoSize\":%u,\"recordSaveOffset\":%u,\"recordDataOffset\":%u,\"recordSize\":%u,\"creationSize\":%u,\"creationNameOffset\":%u,\"saveSize\":%u,\"fieldOffset\":%u,\"posXOffset\":%u,\"posZOffset\":%u,\"masterOffset\":%u,\"lifeOffset\":%u,\"moneyOffset\":%u}\n",
(unsigned)sizeof(void*),(unsigned)sizeof(smCHAR_INFO),(unsigned)offsetof(TRANS_RECORD_DATA,GameSaveInfo),
(unsigned)offsetof(TRANS_RECORD_DATA,Data),(unsigned)sizeof(TRANS_RECORD_DATA),
(unsigned)sizeof(smTRANS_CHAR_COMMAND2),(unsigned)offsetof(smTRANS_CHAR_COMMAND2,szName),
(unsigned)sizeof(sGAME_SAVE_INFO),(unsigned)offsetof(sGAME_SAVE_INFO,PlayStageNum),
(unsigned)offsetof(sGAME_SAVE_INFO,PosX),(unsigned)offsetof(sGAME_SAVE_INFO,PosZ),
(unsigned)offsetof(sGAME_SAVE_INFO,szMasterID),(unsigned)offsetof(smCHAR_INFO,Life),(unsigned)offsetof(smCHAR_INFO,Money));
printf("{\"boneObjectSize\":%u,\"boneNameOffset\":%u,\"boneTmOffset\":%u}\n",(unsigned)sizeof(smOBJ3D),(unsigned)offsetof(smOBJ3D,NodeName),(unsigned)offsetof(smOBJ3D,Tm));
return 0;
}