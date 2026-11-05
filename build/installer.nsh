; Model services keep running after the window closes, so the installer has to deal with them itself.
; Runs after initMultiUser, so $INSTDIR already points at an existing install during an upgrade.
!macro customInit
  ${If} ${FileExists} "$INSTDIR\resources\runtime\node.exe"
    InitPluginsDir
    File "/oname=$PLUGINSDIR\service-control.mjs" "${PROJECT_DIR}\app\service-control.mjs"
    nsExec::Exec '"$INSTDIR\resources\runtime\node.exe" "$PLUGINSDIR\service-control.mjs" stop-for-upgrade'
    Pop $0
  ${EndIf}
!macroend

; One-click uninstall calls SetSilent before this runs, so ${Silent} cannot tell a person from /S.
; An upgrade runs the old uninstaller with /S --updated and must never ask.
!macro customUnInit
  Var /GLOBAL deleteUserData
  StrCpy $deleteUserData "no"
  ${GetParameters} $R0
  ClearErrors
  ${GetOptions} $R0 "/S" $R1
  ${If} ${Errors}
    MessageBox MB_YESNO|MB_ICONQUESTION|MB_DEFBUTTON2 "是否同时删除 Bridge++ 的数据？$\r$\n包括会话、接口密钥和配置备份，删除后不能恢复。" IDNO keepUserData
    StrCpy $deleteUserData "yes"
    keepUserData:
  ${EndIf}
!macroend

; Runs before the installed files are removed, so the script is still on disk.
!macro customUnInstall
  ${ifNot} ${isUpdated}
    ${If} $deleteUserData == "yes"
      nsExec::Exec '"$INSTDIR\resources\runtime\node.exe" "$INSTDIR\resources\app\app\service-control.mjs" uninstall --delete-data'
    ${Else}
      nsExec::Exec '"$INSTDIR\resources\runtime\node.exe" "$INSTDIR\resources\app\app\service-control.mjs" uninstall'
    ${EndIf}
    Pop $0
  ${endIf}
!macroend
