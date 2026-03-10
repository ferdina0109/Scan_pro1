// Get URL params
const urlParams = new URLSearchParams(window.location.search);
const locationName = urlParams.get("loc");
const locationType = urlParams.get("type");

// Display location
document.getElementById("location").innerText = "Location: " + locationName;

// Populate issues dropdown
const issueSelect = document.getElementById("issueOptions");
let issues = [];

if(locationType === "washroom"){
  issues = ["Water leakage in toilet taps","Smelly restroom","Unclean floor","Overflowing dustbin"];
}
if(locationType === "corridor"){
  issues = ["Overflowing dustbin","Litter on floor","Unclean corridor","Bad smell in corridor"];
}

issues.forEach(issue => {
  const option = document.createElement("option");
  option.value = issue;
  option.text = issue;
  issueSelect.appendChild(option);
});

// Handle form submission
document.getElementById("complaintForm").addEventListener("submit", async function(e){
  e.preventDefault(); // Prevent default form submit

  const selectedIssue = issueSelect.value;
  const photoInput = document.getElementById("photoInput");

  // For now, we only send image name (can be extended to upload)
  const photoName = photoInput.files.length > 0 ? photoInput.files[0].name : null;

  // Send to backend
  try {
    const res = await fetch("http://localhost:3000/submit-complaint", { // <-- Your backend URL
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: locationName,
        location_type: locationType,
        issue: selectedIssue,
        photo_name: photoName
      })
    });

    const data = await res.json();

    if(res.ok){
      alert("Complaint submitted successfully!");
    } else {
      alert("Error submitting complaint: " + data.message);
    }

  } catch(err){
    console.error(err);
    alert("Error submitting complaint. Please try again.");
  }
});
