# React + Babel Standalone

## JSX Constraints
- ❌ NO IIFE: \{(()=>{})()}\ breaks Babel
  - ✓ Use: .map(x => { return <div>{x}</div>; })
  - ✓ Use: sub-component
- ❌ NO nested template literals
  - ✓ Use: string concat instead
- ✓ All hooks at top-level
- ✓ Simple ternaries OK: condition ? <A/> : <B/>

## localStorage Keys
- wds_settings, wds_categories, wds_boxTypes, wds_boxes
- wds_fills, wds_exchanges, wds_wards, wds_staff

## Bridge Calls
- Always await: await window.chrome.webview.hostObjects.bridge.PrintLabel(json)
- Always JSON.stringify(): PrintLabel(JSON.stringify({boxId, drugs}))
- Never pass objects; use JSON string

## Component Pattern
\\\javascript
const MyComponent = ({ data }) => {
  const [count, setCount] = useState(0);
  return (
    <div>
      {data.map(item => <div key={item.id}>{item.name}</div>)}
      <button onClick={() => setCount(c => c + 1)}>+1</button>
    </div>
  );
};
\\\

## No
- ❌ console.log in production
- ❌ Missing key props
- ❌ setTimeout without cleanup
- ❌ Inline styles without constants
