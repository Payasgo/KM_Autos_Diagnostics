; Custom NSIS hooks for the ECU Lab installer (electron-builder, nsis.oneClick: false).
; electron-builder is configured with createDesktopShortcut: false, so the shortcut is
; offered here instead, as a question at the end of the install.
!macro customInstall
  MessageBox MB_YESNO|MB_ICONQUESTION "Create a desktop shortcut for ECU Lab?" /SD IDNO IDNO skipDesktopShortcut
    CreateShortCut "$DESKTOP\${PRODUCT_FILENAME}.lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
  skipDesktopShortcut:
!macroend

!macro customUnInstall
  Delete "$DESKTOP\${PRODUCT_FILENAME}.lnk"
!macroend
