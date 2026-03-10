import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/supabase.min.js'
const supabaseUrl = "https://sbrweumvawvcwxztyeeh.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNicndldW12YXd2Y3d4enR5ZWVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMzI5MzEsImV4cCI6MjA4ODcwODkzMX0.CcmUB09BEtGUqRBDmKVhnoX9tF7oAOLDuYmQE34cenk"

const supabase = createClient(supabaseUrl, supabaseKey)

// 3️⃣ Read QR URL parameters
const urlParams = new URLSearchParams(window.location.search)
const locationName = urlParams.get("loc")
const locationType = urlParams.get("type")
const floor = urlParams.get("floor")

// 4️⃣ Show location on page
document.getElementById("location").innerText = "Location: " + locationName

// 5️⃣ Populate issue dropdown
const issueSelect = document.getElementById("issueOptions")
let issues = []

if(locationType === "washroom"){
    issues = [
        "Water leakage in toilet taps",
        "Smelly restroom",
        "Unclean floor",
        "Overflowing dustbin"
    ]
} else if(locationType === "corridor"){
    issues = [
        "Overflowing dustbin",
        "Litter on floor",
        "Unclean corridor",
        "Bad smell in corridor"
    ]
} else if(locationType === "drinking_area"){
    issues = [
        "Dirty sink",
        "Water leakage",
        "Unclean drinking area",
        "Overflowing dustbin"
    ]
}

issues.forEach(issue => {
    const option = document.createElement("option")
    option.value = issue
    option.text = issue
    issueSelect.appendChild(option)
})

// 6️⃣ Handle form submission
document.querySelector("form").addEventListener("submit", async function(e){
    e.preventDefault()
    
    const selectedIssue = issueSelect.value
    const photoInput = document.querySelector("input[type='file']").files[0]
    
    // 7️⃣ Step 1: Find location_id and assigned staff
    const { data: locations, error: locError } = await supabase
        .from('locations')
        .select('id, assigned_staff_id')
        .eq('location_name', locationName)
        .eq('floor', floor)
    
    if(locError || locations.length === 0){
        alert("Location not found!")
        console.log(locError)
        return
    }

    const location_id = locations[0].id
    const staff_id = locations[0].assigned_staff_id

    // 8️⃣ Step 2: Upload photo if available
    let photo_url = null
    if(photoInput){
        const fileExt = photoInput.name.split('.').pop()
        const fileName = `${Date.now()}.${fileExt}`
        const { data: uploadData, error: uploadError } = await supabase
            .storage
            .from('photos')  // create a storage bucket named 'photos'
            .upload(fileName, photoInput)

        if(uploadError){
            alert("Photo upload failed")
            console.log(uploadError)
        } else {
            photo_url = supabase.storage.from('photos').getPublicUrl(fileName).publicUrl
        }
    }

    // 9️⃣ Step 3: Insert complaint into Supabase
    const { data: complaintData, error: compError } = await supabase
        .from('complaints')
        .insert([{ location_id, issue: selectedIssue, photo_url, completed: false }])
        .select()

    if(compError){
        alert("Error submitting complaint")
        console.log(compError)
        return
    }

    const complaint_id = complaintData[0].id

    // 10️⃣ Step 4: Get staff phone number
    const { data: staffData, error: staffError } = await supabase
        .from('cleaning_staff')
        .select('phone_number, name')
        .eq('id', staff_id)

    if(staffError || staffData.length === 0){
        alert("Staff not found!")
        console.log(staffError)
        return
    }

    const phoneNumber = staffData[0].phone_number
    const staffName = staffData[0].name

    // 11️⃣ Step 5: Send SMS via backend
    try {
        await fetch('https://YOUR_BACKEND_API/send-sms', { // Replace with your backend
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phoneNumber: phoneNumber,
                message: `New complaint reported:\nIssue: ${selectedIssue}\nLocation: ${locationName}, ${floor}`
            })
        })
    } catch(e){
        console.log("SMS sending failed:", e)
    }

    // 12️⃣ Step 6: Success message
    alert("Complaint submitted successfully and SMS sent to cleaning staff!")
    document.querySelector("form").reset()
})
