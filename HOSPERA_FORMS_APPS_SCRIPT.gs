function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, service: "hospera-leads" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var params = e && e.parameter ? e.parameter : {};
    var adminEmail = (params.admin_email || params.recipient_email || "admin@hosperainstitute.com").trim();
    var visitorEmail = (params.visitor_email || params.email || "").trim();
    var formType = (params.form_type || "Website enquiry").trim();
    var visitorName = (params.name || "Website visitor").trim();
    var visitorPhone = (params.phone || "").trim();
    var visitorMessage = (params.message || "").trim();
    var enquiryType = (params.enquiry_type || "").trim();
    var sourcePage = (params.source_page || params.page_title || "").trim();
    var sourceUrl = (params.source_url || "").trim();
    var submittedAt = (params.submitted_at || new Date().toISOString()).trim();
    var adminSubject = (params.email_subject || ("New Hospera " + formType)).trim();
    var visitorReplySubject = (params.visitor_reply_subject || "Hospera Institute enquiry received").trim();
    var visitorReplyMessage = (params.visitor_reply_message || "Thanks for your interest. Our team will get back to you shortly.").trim();

    var adminHtml = [
      "<h2>New Hospera Website Enquiry</h2>",
      "<p><strong>Form:</strong> " + escapeHtml(formType) + "</p>",
      "<p><strong>Name:</strong> " + escapeHtml(visitorName) + "</p>",
      "<p><strong>Phone:</strong> " + escapeHtml(visitorPhone || "-") + "</p>",
      "<p><strong>Email:</strong> " + escapeHtml(visitorEmail || "-") + "</p>",
      "<p><strong>Enquiry Type:</strong> " + escapeHtml(enquiryType || "-") + "</p>",
      "<p><strong>Message:</strong><br>" + nl2br(escapeHtml(visitorMessage || "-")) + "</p>",
      "<p><strong>Source Page:</strong> " + escapeHtml(sourcePage || "-") + "</p>",
      "<p><strong>Source URL:</strong> " + escapeHtml(sourceUrl || "-") + "</p>",
      "<p><strong>Submitted At:</strong> " + escapeHtml(submittedAt) + "</p>"
    ].join("");

    var adminBody = [
      "New Hospera Website Enquiry",
      "",
      "Form: " + formType,
      "Name: " + visitorName,
      "Phone: " + (visitorPhone || "-"),
      "Email: " + (visitorEmail || "-"),
      "Enquiry Type: " + (enquiryType || "-"),
      "Message: " + (visitorMessage || "-"),
      "Source Page: " + (sourcePage || "-"),
      "Source URL: " + (sourceUrl || "-"),
      "Submitted At: " + submittedAt
    ].join("\n");

    MailApp.sendEmail({
      to: adminEmail,
      subject: adminSubject,
      body: adminBody,
      htmlBody: adminHtml,
      name: "Hospera Website Leads"
    });

    if (visitorEmail) {
      var visitorHtml = [
        "<p>Dear " + escapeHtml(visitorName) + ",</p>",
        "<p>" + escapeHtml(visitorReplyMessage) + "</p>",
        "<p>Regards,<br>Hospera Institute Team</p>"
      ].join("");

      var visitorBody = [
        "Dear " + visitorName + ",",
        "",
        visitorReplyMessage,
        "",
        "Regards,",
        "Hospera Institute Team"
      ].join("\n");

      MailApp.sendEmail({
        to: visitorEmail,
        subject: visitorReplySubject,
        body: visitorBody,
        htmlBody: visitorHtml,
        name: "Hospera Institute"
      });
    }

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(error) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function nl2br(value) {
  return String(value).replace(/\n/g, "<br>");
}
