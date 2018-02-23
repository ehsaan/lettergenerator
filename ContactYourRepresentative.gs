// Based on script by: TJ Houston tjhouston.com 
// +----- http://tjhouston.com/2012/03/merge-info-from-google-forms-to-pdf-document-and-send-via-email/
// EhsanN: Senator look up added based on Google Civic API: 
//+------ https://developers.google.com/civic-information/docs/v2/representatives

var docTemplate = "CHANGEME:DOCID_FROM_DOCSGOOGLECOM_URL"; //This is the template which will be copied from
var googleAPIKey = "CHANGEME:ABCDEFGHIJKLMNOPQRSTUVWXYZ_APIKEYISHERE";
var docName = "Contact Your Representative";

// When Form Gets submitted
function onFormSubmit(e) {
  if (typeof(e) == "undefined"){
    /* to allow running code in debugger                    */
    /* you can feed various input here to test corner cases */
    e = Object();
    console.log("e is now" + e)
    e.values = [];
    e.values[0] = "2/13/2018 14:56:24";
    e.values[1] = ""
    e.values[5] = "immigrantsunited1 At gmail om";
    e.values[1] = "95050";
    e.values[6] = "John Smith";
    e.values[7] = "";
  } 
  var pdfs = [];
  var copyIds = [];
  var errors = [];
  
  //Get information from form and set as variables
  var zip_code = e.values[1];
  var email_address = e.values[5];
  var your_name = e.values[6];
  var your_address = e.values[7];

  if (zip_code < 9999 && zip_code > 999){
    zip_code = "0" + zip_code;
  }
  
  var d = new Date();
  var date_now = d.toLocaleDateString(); 
  //get representatives: needs to be its own function
  var urls = [
         ["https://www.googleapis.com/civicinfo/v2/representatives?key="
             +googleAPIKey+"&levels=country&includeOffices=true&roles=legislatorUpperBody&address="
             +encodeURIComponent(your_address+" "+zip_code), "senate"],
         ["https://www.googleapis.com/civicinfo/v2/representatives?key="
          +googleAPIKey+"&levels=country&includeOffices=true&roles=legislatorLowerBody&address="
          +encodeURIComponent(your_address+" "+zip_code), "congress"]];
  
  if (your_address.length == 0){
    errors.push("I noticed you did not provide your address. FYI, without the complete address your Congress representative may not be correctly found.");
  }
  for (var i=0; i < urls.length; i++){
    Logger.log(urls[i][1]);
    var url = urls[i][0];
    var official_type = urls[i][1];
    var response = UrlFetchApp.fetch(url, {'muteHttpExceptions': true});
    var json = response.getContentText();
    var data = 
        JSON.parse(json);
    if (data.hasOwnProperty("error")){
      Logger.log("Error:" + data.error.message);
      errors.push(data.error.message.toString());
    }
    else if (! data.hasOwnProperty("officials") || ! data.officials.hasOwnProperty("length")){
      errors.push("Error: could not find "+official_type+" representatives. Did you provide your complete address?");
    }
    else {
      for (var j = 0; j < data.officials.length; j++){
        var rep = data.officials[j];
        var rep_name = rep.name;
        Logger.log(rep.name, official_type);
        var rep_address = rep.address[0].line1 + "\n"+ 
          rep.address[0].city + " "+ rep.address[0].state + " "+ rep.address[0].zip;
        var rep_link  = JSON.stringify(rep.urls);
        var title = "Representative";
        var address_title = "The Honorable";
        if (official_type.indexOf("senate")!= -1){
          title = "Senator";
          address_title = "Senator";
        }
        
        // Get document template, copy it as a new temp doc, and save the Doc’s id
        var copyId = DriveApp.getFileById(docTemplate).makeCopy(docName+' for '+rep_name).getId();
        // Open the temporary document
        var copyDoc = DocumentApp.openById(copyId);
        // Get the document’s body section
        var copyBody = copyDoc.getActiveSection();
        
        // Replace place holder keys,in our google doc template
        copyBody.replaceText('keyRepName', rep_name);
        copyBody.replaceText('keyYourName', your_name);
        copyBody.replaceText('keyYourAddress', your_address);
        copyBody.replaceText('keyRepAddress', rep_address);
        copyBody.replaceText('dynamicDate', date_now);
        copyBody.replaceText('dynamicRepTitle', title);
        copyBody.replaceText('dynamicRepAddressTitle', address_title);
        
        
        // Save and close the temporary document
        copyDoc.saveAndClose();
        
        // Convert temporary document to PDF
        var pdf = DriveApp.getFileById(copyId).getAs("application/pdf");
        pdfs.push(pdf);
        copyIds.push(copyId);
        
      }
    }
  }

  // Attach PDF and send the email
  var subject = "Contact your representative: please print and mail";
  var body = "Hi " + your_name + ". \n\n The message is ready, but it is *not* sent yet. Please print this and mail it (using postal service) to your representative. Their address is on top of each letter.\n It is vital to "
  + "contact them so they are aware of the troubles this unjust ban are causing us. You can also send an email to each, but we cannot automate that part.";
  var html_body = "Hi " + your_name + ". <p>The message is ready, but it is <b>not</b> sent yet. Please print this and mail it (using postal service) to your representative. Their address is on top of each letter.</p> <p>It is vital to "
  + "contact them so they are aware of the troubles this unjust ban are causing us. You can also send an email to each, but we cannot automate that part.</p> Best, <br />Immigrants United Campaigns.";
  for(e in errors){
    Logger.log(errors[e]);
    body += "\n Error: " + errors[e];
    html_body = html_body + "<br><b>Error</b>:<br /> " + errors[e];
  }
  MailApp.sendEmail(email_address, subject, body, {name: "Immigrant United", htmlBody: html_body, attachments: pdfs});

    // Delete temp files
  for (var i =0; i < copyIds.length; i++){
    DriveApp.getFileById(copyIds[i]).setTrashed(true);
  }

}
