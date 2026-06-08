# C# Code Style

## Naming
- Classes: PascalCase (MainForm, WebBridge)
- Methods: PascalCase (PrintLabel, ShowAlert)
- Variables: camelCase (boxId, fillDate)
- Constants: UPPER_SNAKE_CASE
- Private fields: _camelCase (_webView2, _bridge)

## Structure
- One class per file (except Designer.cs)
- Bridge methods ALWAYS async
- WebView2 calls wrapped in try-catch
- Using statements for disposables

## COM Interop
- [ComVisible(true)] on bridge methods
- Only COM-compatible params: string, int, bool, Task
- NO complex objects; use JSON strings
- Example: PrintLabel(string jsonData) ✓, NOT PrintLabel(BoxData) ✗

## No
- ❌ Hardcoded strings
- ❌ Sync over async (.Result, .Wait())
- ❌ Magic numbers
