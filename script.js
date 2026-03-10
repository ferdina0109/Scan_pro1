const supabaseUrl = "YOUR_SUPABASE_URL"
const supabaseKey = "YOUR_SUPABASE_ANON_KEY"

const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey)

const urlParams = new URLSearchParams(window.location.search)

const locationName = urlParams.get("loc")
const locationType = urlParams.get("type")
const floor = urlParams.get("floor")

document.getElementById("location").innerText =
"Location: " + locationName

const issueSelect = document.getElementById("issueOptions")

let issues = []

if(locationType === "washroom"){
issues = [
"Water leakage",
"Bad smell",
"Unclean floor",
"Overflowing dustbin"
]
}

if(locationType === "corridor"){
issues = [
"Overflowing dustbin",
"Litter on floor",
"Unclean corridor",
"Bad smell"
]
}

if(locationType === "drinking"){
issues = [
"Dirty sink",
"Water leakage",
"Unclean area"
]
}

issues.forEach(function(issue){

let option = document.createElement("option")

option.value = issue
option.text = issue

issueSelect.appendChild(option)

})

document.getElementById("complaintForm").addEventListener("submit", async function(e){

e.preventDefault()

const issue = document.getElementById("issueOptions").value

document.getElementById("statusMessage").innerText =
"Submitting complaint..."

const { data, error } = await supabaseClient
.from("complaints")
.insert([
{
issue: issue
}
])

if(error){

console.log(error)

document.getElementById("statusMessage").innerText =
"Error submitting complaint"

}
else{

document.getElementById("statusMessage").innerText =
"Complaint submitted successfully"

}

})