function doGet() {
  return jsonResponse({ ok: true, message: "Hospera tracker sync is live." });
}

function doPost(e) {
  try {
    var payload = parsePayload_(e);
    if (!payload || !payload.event_type) {
      return jsonResponse({ ok: false, error: "Missing event_type" });
    }

    if (payload.event_type === "lead_submission") {
      syncLeadSubmission_(payload);
      return jsonResponse({ ok: true, target: payload.tracker_target || "enquiry" });
    }

    if (payload.event_type === "live_chat") {
      syncLiveChat_(payload);
      return jsonResponse({ ok: true, target: "enquiry" });
    }

    return jsonResponse({ ok: false, error: "Unsupported event_type" });
  } catch (error) {
    return jsonResponse({ ok: false, error: error.message || String(error) });
  }
}

function syncLeadSubmission_(payload) {
  if ((payload.tracker_target || "").toLowerCase() === "apply_now") {
    upsertApplyRow_(payload);
    return;
  }

  upsertEnquiryRow_(payload);
}

function syncLiveChat_(payload) {
  upsertEnquiryRow_(payload);
}

function upsertEnquiryRow_(payload) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Enquiry Tracker");
  if (!sheet) throw new Error('Sheet "Enquiry Tracker" not found');

  var when = parseDate_(payload.submitted_at);
  var headers = getHeaderMap_(sheet);
  var rowValues = {
    "Lead ID": payload.external_id || createId_("ENQ"),
    "Date Received": when,
    "Time Received": when,
    "Full Name": value_(payload.full_name),
    "Phone": value_(payload.phone),
    "Email": value_(payload.email),
    "Course / Interest": value_(payload.interest || payload.form_type),
    "Source Channel": value_(payload.source_channel || "Website Form"),
    "Source Page": value_(payload.source_page || payload.source_url),
    "City / Country": value_(payload.city),
    "Message": value_(payload.message),
    "Status": "New",
    "Priority": payload.source_channel === "Live Chat" ? "High" : "Medium",
    "Assigned To": "",
    "Contacted?": "No",
    "First Contact Date": "",
    "Outcome": "Pending",
    "Next Action": payload.source_channel === "Live Chat" ? "Reply in admin panel" : "Call back lead",
    "Follow-up Date": "",
    "Last Updated": when,
    "Notes": "Auto-synced from website"
  };

  upsertRowById_(sheet, headers, "Lead ID", rowValues);
}

function upsertApplyRow_(payload) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Apply Now");
  if (!sheet) throw new Error('Sheet "Apply Now" not found');

  var when = parseDate_(payload.submitted_at);
  var headers = getHeaderMap_(sheet);
  var rowValues = {
    "Candidate ID": payload.external_id || createId_("APP"),
    "Date Received": when,
    "Time Received": when,
    "Full Name": value_(payload.full_name),
    "Phone": value_(payload.phone),
    "Email": value_(payload.email),
    "Current City": value_(payload.city),
    "Highest Qualification": value_(payload.highest_qualification),
    "Interested Program": value_(payload.interested_program || payload.interest),
    "Career Goal": value_(payload.career_goal || payload.message),
    "Source Channel": value_(payload.source_channel || "Website Form"),
    "Source Page": value_(payload.source_page || payload.source_url),
    "Status": "New",
    "Priority": "High",
    "Assigned To": "",
    "Contacted?": "No",
    "First Contact Date": "",
    "Outcome": "Pending",
    "Next Action": "Call applicant urgently",
    "Follow-up Date": "",
    "Last Updated": when,
    "Notes": "Auto-synced from Apply Now"
  };

  upsertRowById_(sheet, headers, "Candidate ID", rowValues);
}

function upsertRowById_(sheet, headers, idHeader, rowValues) {
  var idColumn = headers[idHeader];
  if (!idColumn) throw new Error("ID column not found: " + idHeader);

  var externalId = rowValues[idHeader];
  var lastRow = Math.max(sheet.getLastRow(), 1);
  var existingValues = lastRow > 1 ? sheet.getRange(2, idColumn, lastRow - 1, 1).getValues() : [];
  var targetRow = null;

  for (var index = 0; index < existingValues.length; index++) {
    if (String(existingValues[index][0]).trim() === String(externalId).trim()) {
      targetRow = index + 2;
      break;
    }
  }

  if (!targetRow) {
    targetRow = lastRow + 1;
  }

  Object.keys(rowValues).forEach(function (header) {
    var column = headers[header];
    if (!column) return;
    sheet.getRange(targetRow, column).setValue(rowValues[header]);
  });
}

function getHeaderMap_(sheet) {
  var headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var map = {};
  headerRow.forEach(function (header, index) {
    if (header) {
      map[String(header).trim()] = index + 1;
    }
  });
  return map;
}

function parsePayload_(e) {
  if (!e) return null;

  if (e.postData && e.postData.contents) {
    return JSON.parse(e.postData.contents);
  }

  return e.parameter || null;
}

function parseDate_(value) {
  var date = value ? new Date(value) : new Date();
  return isNaN(date.getTime()) ? new Date() : date;
}

function createId_(prefix) {
  return prefix + "-" + new Date().getTime();
}

function value_(input) {
  return input == null ? "" : String(input).trim();
}

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
