// Get URL params
const urlParams = new URLSearchParams(window.location.search);
let locationName = urlParams.get("loc");
let locationType = urlParams.get("type");
let staffFloor = urlParams.get("floor");

// Populate issues dropdown
const issueSelect = document.getElementById("issueOptions");

// If no params, show error
if (!locationName || !locationType || !staffFloor) {
  document.getElementById("location").innerText = "Error: Please scan a valid QR code to access this page.";
  document.getElementById("complaintForm").style.display = "none";
} else {
  // Display location
  document.getElementById("location").innerText = "Location: " + locationName;
  populateIssues();
}

function populateIssues() {
  // Populate issues dropdown
  let issues = [];

  if(locationType === "washroom"){
    issues = ["Water leakage in toilet taps","Smelly restroom","Unclean floor","Overflowing dustbin"];
  }
  if(locationType === "corridor"){
    issues = ["Overflowing dustbin","Litter on floor","Unclean corridor","Bad smell in corridor"];
  }
  if(locationType === "drinking area"){
    issues = ["Dirty sink","Overflowing dustbin","Water leakage"];
  }

  issues.forEach(issue => {
    const option = document.createElement("option");
    option.value = issue;
    option.text = issue;
    issueSelect.appendChild(option);
  });
}

// Handle form submission
document.getElementById("complaintForm").addEventListener("submit", async function(e){
  e.preventDefault(); // Prevent default form submit

  const isLocal =
    window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  const submitUrl = isLocal
    ? "http://localhost:3000/submit-complaint"
    : "/api/submit-complaint";

  const selectedIssue = issueSelect.value;
  const photoInput = document.getElementById("photoInput");

  // For now, we only send image name (can be extended to upload)
  const photoName = photoInput.files.length > 0 ? photoInput.files[0].name : null;

  // Send to backend
  try {
    const res = await fetch(submitUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: locationName,
        location_type: locationType,
        issue: selectedIssue,
        staff_floor: staffFloor,
        photo_name: photoName
      })
    });

    const data = await res.json();

    if(res.ok){
      alert("Complaint submitted successfully!");
    } else {
      alert("Error submitting complaint: " + (data.error || data.message || "Unknown error"));
    }

  } catch(err){
    console.error(err);
    alert("Error submitting complaint. Please try again.");
  }
});
