fetch("http://localhost:5001/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    query: "Goa trip for 3 nights 900km",
    option: "estimate_cost"
  })
})
.then(r => r.text())
.then(console.log)
.catch(console.error);
