document.getElementById('username-form').addEventListener('submit', function(event) {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const referralCode = document.getElementById('referral-code').value;

    // TODO: Validate username availability using Airtable or Google Sheets API.
    // TODO: Send the form data to Airtable or Google Sheets for storage using Zapier.
    
    alert(`Username: ${username}, Email: ${email}, Referral Code: ${referralCode} submitted successfully!`);
    
    // Redirect to a thank you or confirmation page if needed
});
