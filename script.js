// script.js - Full frontend integration with backend

const urlParams = new URLSearchParams(window.location.search);
const locationName = urlParams.get("loc");      // Example: "Block A - Floor 1"
const locationType = urlParams.get("type");     // Example: "washroom"

document.getElementById("location").innerText = "Location: " + locationName;

// Populate issues dropdown based on location type
const issueSelect = document.getElementById("issueOptions");
let issues = [];

if(locationType === "washroom"){
  issues = [
    "Water leakage in toilet taps",
    "Smelly restroom",
    "Unclean floor",
    "Overflowing dustbin",
    "Lack of sanitary pads"
  ];
} else if(locationType === "corridor"){
  issues = [
    "Overflowing dustbin",
    "Litter on floor",
    "Unclean corridor",
    "Bad smell in corridor"
  ];
} else if(locationType === "drinking_area"){
  issues = [
    "Dirty sink",
    "Water leakage",
    "Unclean drinking area",
    "Overflowing dustbins"
  ];
}

issues.forEach(issue => {
  const option = document.createElement("option");
  option.value = issue;
  option.text = issue;
  issueSelect.appendChild(option);
});

// Handle form submission
const form = document.querySelector("form");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const selectedIssue = issueSelect.value;
  const fileInput = document.querySelector('input[type="file"]');
  const photo = fileInput.files[0];

  try {
    // Send complaint to backend
    const response = await fetch("http://localhost:3000/submit-complaint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: locationName,
        location_type: locationType,
        issue: selectedIssue,
        staff_floor: locationName, // match assigned floor in Supabase
        photo_url: photo ? photo.name : null
      })
    });

    const data = await response.json();

    if(response.ok){
      alert("Complaint submitted successfully!");
      form.reset();
      fetchLeaderboard(); // optional: refresh leaderboard if needed
    } else {
      throw new Error(data.error || "Submission failed");
    }
  } catch(err){
    console.error(err);
    alert("Error submitting complaint. Please try again.");
  }
});

// --------- Mark Task Completed (for staff) ---------
async function markCompleted(complaintId, staffId){
  try {
    const response = await fetch("http://localhost:3000/complete-task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ complaint_id: complaintId, staff_id: staffId })
    });

    const data = await response.json();

    if(response.ok){
      alert(`Task completed! Points earned: ${data.points}`);
      fetchLeaderboard(); // Update leaderboard after completion
    } else {
      throw new Error(data.error || "Failed to complete task");
    }

  } catch(err){
    console.error(err);
    alert("Error completing task.");
  }
}

// --------- Fetch and display leaderboard ---------
async function fetchLeaderboard(){
  try {
    const response = await fetch("http://localhost:3000/leaderboard");
    const data = await response.json();

    const leaderboardDiv = document.getElementById("leaderboard");
    leaderboardDiv.innerHTML = ""; // clear previous

    data.leaderboard.forEach((staff, index) => {
      const div = document.createElement("div");
      div.innerText = `${index + 1}. ${staff.name} - ${staff.points} points`;
      leaderboardDiv.appendChild(div);
    });

  } catch(err){
    console.error(err);
  }
}

// Call leaderboard fetch on page load
fetchLeaderboard();
