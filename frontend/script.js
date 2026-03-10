// Get URL params
const urlParams = new URLSearchParams(window.location.search);
let locationName = urlParams.get("loc");
let locationType = urlParams.get("type");
let staffFloor = urlParams.get("floor");

// Populate issues dropdown
const issueSelect = document.getElementById("issueOptions");

// If no params (for testing), show selection form
if (!locationName || !locationType) {
  document.getElementById("location").innerText = "Select Location for Testing:";

  // Hide the complaint form initially
  document.getElementById("complaintForm").style.display = "none";

  // Create a selection form
  const selectForm = document.createElement("form");
  selectForm.id = "locationSelectForm";

  const locLabel = document.createElement("label");
  locLabel.textContent = "Location Name:";
  const locInput = document.createElement("input");
  locInput.type = "text";
  locInput.id = "locInput";
  locInput.required = true;

  const floorLabel = document.createElement("label");
  floorLabel.textContent = "Floor/Block:";
  const floorInput = document.createElement("input");
  floorInput.type = "text";
  floorInput.id = "floorInput";
  floorInput.required = true;

  const typeLabel = document.createElement("label");
  typeLabel.textContent = "Location Type:";
  const typeSelect = document.createElement("select");
  typeSelect.id = "typeSelect";
  typeSelect.required = true;
  ["washroom", "corridor"].forEach(type => {
    const option = document.createElement("option");
    option.value = type;
    option.text = type;
    typeSelect.appendChild(option);
  });

  const submitBtn = document.createElement("button");
  submitBtn.type = "submit";
  submitBtn.textContent = "Proceed";

  selectForm.appendChild(locLabel);
  selectForm.appendChild(locInput);
  selectForm.appendChild(floorLabel);
  selectForm.appendChild(floorInput);
  selectForm.appendChild(typeLabel);
  selectForm.appendChild(typeSelect);
  selectForm.appendChild(submitBtn);

  document.querySelector(".container").appendChild(selectForm);

  selectForm.addEventListener("submit", function(e) {
    e.preventDefault();
    locationName = locInput.value;
    staffFloor = floorInput.value;
    locationType = typeSelect.value;
    document.getElementById("location").innerText = "Location: " + locationName;
    selectForm.style.display = "none";
    document.getElementById("complaintForm").style.display = "block";
    populateIssues();
  });
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
        staff_floor: staffFloor,
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