#define AppName "BoxBox"
#define AppVersion "1.3.2"
#define AppExeName "BoxBox.exe"
#define SourceDir "D:\COACH\source\repo\BoxBox\bin\Release\net9.0-windows\win-x64\publish"

[Setup]
AppId={{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher=กลุ่มงานเภสัชกรรม โรงพยาบาลสมเด็จพระยุพราชสว่างแดนดิน
AppCopyright=Copyright 2568 กลุ่มงานเภสัชกรรม โรงพยาบาลสมเด็จพระยุพราชสว่างแดนดิน
VersionInfoDescription=BoxBox — Ward Emergency Drug Box Management
VersionInfoProductName=BoxBox
VersionInfoCompany=กลุ่มงานเภสัชกรรม โรงพยาบาลสมเด็จพระยุพราชสว่างแดนดิน
VersionInfoVersion={#AppVersion}.0
DefaultDirName={localappdata}\Programs\{#AppName}
DefaultGroupName={#AppName}
OutputDir=D:\COACH\source\repo\BoxBox\installer
OutputBaseFilename=BoxBoxSetup_v{#AppVersion}
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
InfoBeforeFile=readme.txt
; ── Code Signing ── uncomment เมื่อมี certificate (.pfx) ─────────────────────
; SignTool=signtool sign /fd SHA256 /tr http://timestamp.digicert.com /td SHA256 /f "D:\cert\BoxBox.pfx" /p "%CERT_PASS%" $f
; SignedUninstaller=yes
PrivilegesRequired=lowest

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
Source: "{#SourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "readme.txt"; DestDir: "{app}"; Flags: ignoreversion

[Code]
function InitializeSetup(): Boolean;
begin
  if not WizardSilent() then
    MsgBox(
      'BoxBox — ระบบกล่องยาฉุกเฉิน' + #13#10 +
      'กลุ่มงานเภสัชกรรม รพร.สว่างแดนดิน' + #13#10#13#10 +
      'Windows อาจแจ้งเตือนว่าไฟล์นี้ไม่ปลอดภัย' + #13#10 +
      'เนื่องจากผู้พัฒนาไม่มีงบซื้อ Code Signing Certificate' + #13#10 +
      '(ราคา ~6,000–15,000 บาท/ปี)' + #13#10#13#10 +
      'BoxBox ไม่ใช่ไวรัส — พัฒนาเพื่อใช้ภายในโรงพยาบาลเท่านั้น' + #13#10 +
      'อ่านรายละเอียดเพิ่มเติมได้ใน readme.txt',
      mbInformation, MB_OK);
  Result := True;
end;

[Icons]
Name: "{group}\{#AppName}"; Filename: "{app}\{#AppExeName}"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#AppExeName}"

[Run]
Filename: "{app}\{#AppExeName}"; Description: "Launch BoxBox"; Flags: nowait postinstall skipifsilent runascurrentuser
