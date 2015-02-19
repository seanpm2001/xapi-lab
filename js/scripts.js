/* Initialize */

// Initialize the editor
var editor = ace.edit('editor');
editor.getSession().setMode('ace/mode/javascript');

var notificationSettings = {
    animate: {
        enter: 'animated fadeInUp',
        exit: 'animated fadeOutDown'
    },
    type: "success",
    placement: {
        from: "bottom",
        align: "right"
    },
};
var notificationErrorSettings = jQuery.extend(true, {}, notificationSettings);
notificationErrorSettings.type = "danger";

var dateTimeSettings = {
    showTodayButton: true,
    showClear: true
};

// Handle XAPIWrapper XHR Errors
ADL.xhrRequestOnError = function(xhr, method, url, callback, callbackargs) {
    console.log(xhr);
    $.growl({ title: "Status " + xhr.status + " " + xhr.statusText + ": ", message: xhr.response }, notificationErrorSettings);
};

stmts = [];

// Page Load
$(function(){
    // Pretty Print
    prettyPrint();

    // Populate the predefined verbs dropdown
    for (var key in ADL.verbs) {
        var $options1 = $("#predefined-verb");
        var $options2 = $("#search-predefined-verb");
        if (ADL.verbs.hasOwnProperty(key)) {
            //console.log(key + " -> " + ADL.verbs[key]['id'] + " -- " + ADL.verbs[key]['display']['en-US']);
            $options1.append($("<option />").val(ADL.verbs[key]['id']).text(ADL.verbs[key]['display']['en-US']));
            $options2.append($("<option />").val(ADL.verbs[key]['id']).text(ADL.verbs[key]['display']['en-US']));
        }
    }

    $("#actor-types > div").hide();
    $("#actor-Agent").show();

    $("#object-types > div").hide();
    $("#object-Activity").show();

    $('#search-statements-since-date').datetimepicker(dateTimeSettings);
    $('#search-statements-until-date').datetimepicker(dateTimeSettings);
    $('#get-document-since-date').datetimepicker(dateTimeSettings);

    var hash = window.location.hash;
    hash && $('ul.nav a[href="' + hash + '"]').tab('show');

    $('.nav-tabs a').click(function (e) {
        $(this).tab('show');
        if (history.pushState) {
            history.pushState(null, null, this.hash);
        } else {
            location.hash = this.hash;;
        }
    });
});

/*
 * Bindings
 */

/* General */
 
$("body").on("click", ".collapser a", function (e) { e.preventDefault(); });


/* Statement Builder */

$("#statement-builder-values").change(function(e) {
    if ($("#automatically-build").is(':checked')) {
        previewStatement();
    }
});

$("#endpoint-values").validator();
$("#statement-builder-values").validator();
$("#statement-search-values").validator();
$("#dmar-values").validator();

$("#actor-type").change(function() {
    var actorType = $(this).val();
    $("#actor-types > div").hide();
    $("#actor-types > #actor-" + actorType).show();
});

$("#predefined-verb").change(function() {
    var $this = $(this);
    $("#verb-id").val($this.val());
    $("#verb-display").val($this.children(':selected').text());
});

$("#object-type").change(function() {
    var objectType = $(this).val();
    $("#object-types > div").hide();
    $("#object-types > #object-" + objectType).show();
});


/*  Statement Manipulation and Response -- Sending */

$("#generate-statement").click(function(e) {
    previewStatement();
    e.preventDefault();
});

// Try parsing JSON to validate it
$("#validate-json").click(function(e) {
    var r = validateJSON(editor.getValue());
    var whichNotificationSettings = (r == true) ? notificationSettings : notificationErrorSettings;
    var notificationStatus = (r == true) ? "JSON is valid" : "JSON is <em>NOT</em> valid";
    $.growl({ title: notificationStatus }, whichNotificationSettings);
    e.preventDefault();
});

$("#queue-statement").click(function(e) {
    queueStatement();
    e.preventDefault();
});

$("#send-statement").click(function(e) {
    sendStatement();
    e.preventDefault();
});

$("#clear-sent-statements").click(function(e) {
    clearSentStatements();
    e.preventDefault();
});

$("#clear-statement-queue").click(function(e) {
    clearStatementQueue();
    e.preventDefault();
});

$("#send-statement-queue").click(function(e) {
    sendStatementQueue();
    e.preventDefault();
});


/*  Statement Manipulation and Response -- Receiving */

$("#search-predefined-verb").change(function() {
    var $this = $(this);
    $("#search-user-verb-id").val($this.val());
});

$("#get-statements-with-search").click(function(e) {
    getStatementsWithSearch();
    e.preventDefault();
});

$("#clear-received-statements").click(function(e) {
    clearReceivedStatements();
    e.preventDefault();
});


/*  Document Manipulation and Response -- Sending */

$("#send-state").click(function(e) {
    sendState();
    e.preventDefault();
});

$("#send-activity-profile").click(function(e) {
    sendActivityProfile();
    e.preventDefault();
});

$("#send-agent-profile").click(function(e) {
    sendAgentProfile();
    e.preventDefault();
});

$("#clear-sent-documents").click(function(e) {
    clearSentDocuments();
    e.preventDefault();
});


/*  Document Manipulation and Response -- Receiving */

$("#get-state").click(function(e) {
    getState();
    e.preventDefault();
});

$("#get-activity-profile").click(function(e) {
    getActivityProfile();
    e.preventDefault();
});

$("#get-agent-profile").click(function(e) {
    getAgentProfile();
    e.preventDefault();
});

$("#clear-received-documents").click(function(e) {
    clearReceivedDocuments();
    e.preventDefault();
});


/*  Document Manipulation and Response -- Deleting */

$("#delete-state").click(function(e) {
    deleteState();
    e.preventDefault();
});

$("#delete-activity-profile").click(function(e) {
    deleteActivityProfile();
    e.preventDefault();
});

$("#delete-agent-profile").click(function(e) {
    deleteAgentProfile();
    e.preventDefault();
});

$("#clear-deleted-documents").click(function(e) {
    clearDeletedDocuments();
    e.preventDefault();
});


/*
 * Functions
 */

// Override any credentials put in the XAPIWrapper.js
function setupConfig() {
    // get LRS credentials from user interface
    var endpoint = $("#endpoint").val();
    var user = $("#username").val();
    var password = $("#password").val();

    var conf = {
        "endpoint" : endpoint,
        "auth" : "Basic " + toBase64(user + ":" + password),
    };
    ADL.XAPIWrapper.changeConfig(conf);
}

// Build statement from the GUI
function buildStatement() {
    var actorType = $("#actor-type").val();
    var actorAgentEmail = $("#actor-agent-email").val();
    var actorAgentName = $("#actor-agent-name").val();
    var actorGroupName = $("#actor-group-name").val();
    var actorGroupMembers = $("#actor-group-members").val();
    var verbID = $("#verb-id").val();
    var verbDisplay = $("#verb-display").val();
    var verbLanguage = $("#verb-language").val();
    var objectType = $("#object-type").val();
    var objectActivityID = $("#object-activity-id").val();
    var objectActivityName = $("#object-activity-name").val();
    var objectActivityDescription = $("#object-activity-description").val();
    var objectActivityLanguage = $("#object-activity-language").val();
    var objectAgentEmail = $("#object-agent-email").val();
    var objectAgentName = $("#object-agent-name").val();
    var objectGroupName = $("#object-group-name").val();
    var objectGroupMembers = $("#object-group-members").val();
    var objectStatementRef = $("#object-statementref-id").val();
    var objectSubStatement = $("#object-substatement-json").val();
    var resultScaledScore = $("#result-scaled-score").val();
    var resultRawScore = $("#result-raw-score").val();
    var resultMinScore = $("#result-min-score").val();
    var resultMaxScore = $("#result-max-score").val();
    var resultSuccess = $("#result-success").val();
    var resultCompletion = $("#result-completion").val();
    var resultResponse = $("#result-response").val();
    var resultDuration = $("#result-duration").val();
    var resultExtensions = $("#result-extensions").val();
    var contextRegistrationID = $("#context-registration-id").val();
    var contextInstructorEmail = $("#context-instructor-email").val();
    var contextInstructorName = $("#context-instructor-name").val();
    var contextTeamName = $("#context-team-name").val();
    var contextTeamMembers = $("#context-team-members").val();
    var contextContextActivities = $("#context-context-activities").val();
    var contextRevision = $("#context-revision").val();
    var contextPlatform = $("#context-platform").val();
    var contextLanguage = $("#context-language").val();
    var contextStatement = $("#context-statement").val();
    var attachmentUsageType = $("#attachment-usage-type").val();
    var attachmentDisplay = $("#attachment-display").val();
    var attachmentDescription = $("#attachment-description").val();
    var attachmentLanguage = $("#attachment-language").val();
    var attachmentContentType = $("#attachment-content-type").val();
    var attachmentLength = $("#attachment-length").val();
    var attachmentSha2 = $("#attachment-sha2").val();
    var attachmentFileURL = $("#attachment-file-url").val();

    var stmt = {};

    stmt['actor'] = {};
    switch(actorType) {
      case "Agent":
        stmt['actor']['mbox'] = "mailto:" + actorAgentEmail;
        if (actorAgentName != "") { stmt['actor']['name'] = actorAgentName; }
        stmt['actor']['objectType'] = "Agent";
        break;
      case "Group":
        if (actorGroupName != "") { stmt['actor']['name'] = actorGroupName; }
        stmt['actor']['member'] = $.parseJSON(actorGroupMembers);
        break;
      default:
    }
    
    stmt['actor']['objectType'] = actorType;

    stmt['verb'] = {};
    stmt['verb']['id'] = verbID;
    stmt['verb']['display'] = {};
    stmt['verb']['display'][verbLanguage] = verbDisplay;
    stmt['object'] = {};

    switch(objectType) {
      case "Activity":
        stmt['object']['id'] = objectActivityID;
        if (objectActivityName != "" || objectActivityDescription != "") {
            stmt['object']['definition'] = {};
        }
        if (objectActivityName != "" && objectActivityLanguage != "") {
            stmt['object']['definition']['name'] = {};
            stmt['object']['definition']['name'][objectActivityLanguage] = objectActivityName;
        }
        if (objectActivityDescription != "" && objectActivityLanguage != "") {
            stmt['object']['definition']['description'] = {};
            stmt['object']['definition']['description'][objectActivityLanguage] = objectActivityDescription;
        }
        break;
      case "Agent":
        stmt['object']['mbox'] = "mailto:" + objectAgentEmail;
        if (objectAgentName != "") { stmt['object']['name'] = objectAgentName; }
        break;
      case "Group":
        if (objectGroupName != "") { stmt['object']['name'] = objectGroupName; }
        stmt['object']['member'] = $.parseJSON(objectGroupMembers);
        break;
      case "StatementRef":
        stmt['object']['id'] = objectStatementRef;
        break;
      case "SubStatement":
        stmt['object'] = $.parseJSON(objectSubStatement);
        break;
      default:
    }
    
    stmt['object']['objectType'] = objectType;

    if ( resultScaledScore != "" || resultRawScore != "" || resultMinScore != "" || resultMaxScore != "" || resultSuccess != "" || resultCompletion != "" || resultResponse != "" || resultDuration != "" || resultExtensions != "" ) {
        stmt['result'] = {};
        if ( resultScaledScore != "" || resultRawScore != "" || resultMinScore != "" || resultMaxScore != "" ) {
            stmt['result']['score'] = {};
            if (resultScaledScore != "") { stmt['result']['score']['scaled'] = parseFloat(resultScaledScore); }
            if (resultRawScore != "") { stmt['result']['score']['raw'] = parseInt(resultRawScore); }
            if (resultMinScore != "") { stmt['result']['score']['min'] = parseInt(resultMinScore); }
            if (resultMaxScore != "") { stmt['result']['score']['max'] = parseInt(resultMaxScore); }
        }
        if (resultSuccess != "") { stmt['result']['success'] = (resultSuccess === 'true'); }
        if (resultCompletion != "") { stmt['result']['completion'] = (resultCompletion === 'true'); }
        if (resultResponse != "") { stmt['result']['response'] = resultResponse; }
        if (resultDuration != "") { stmt['result']['duration'] = resultDuration; }
        if (resultExtensions != "") { stmt['result']['extensions'] = $.parseJSON(resultExtensions); }
    }

    if ( contextRegistrationID != "" || contextInstructorEmail != "" || contextInstructorName != "" || contextTeamName != "" || contextTeamMembers != "" || contextContextActivities != "" || contextRevision != "" || contextPlatform != "" || contextLanguage != "" || contextStatement != "" ) {
        stmt['context'] = {};
        if (contextRegistrationID != "") { stmt['context']['registration'] = contextRegistrationID; }
        if (contextInstructorEmail != "" || contextInstructorName != "") {
            stmt['context']['instructor'] = {};
            if (contextInstructorEmail != "") { stmt['context']['instructor']['mbox'] = "mailto:" + contextInstructorEmail; }
            if (contextInstructorName != "") { stmt['context']['instructor']['name'] = contextInstructorName; }
        }
        if (contextTeamName != "" || contextTeamMembers != "") { // This is going to need to support more formats
            stmt['context']['team'] = {};
            if (contextTeamName != "") { stmt['context']['team']['name'] = contextTeamName; }
            if (contextTeamMembers != "") { stmt['context']['team']['member'] = $.parseJSON(contextTeamMembers); }
            stmt['context']['team']['objectType'] = "Group";
        }
        if (contextContextActivities != "") { // The user must know where they are doing here
            stmt['context']['contextActivities'] = $.parseJSON(contextContextActivities);
        }
        if (contextRevision != "") { stmt['context']['revision'] = contextRevision; }
        if (contextPlatform != "") { stmt['context']['platform'] = contextPlatform; }
        if (contextLanguage != "") { stmt['context']['language'] = contextLanguage; }
        if (contextStatement != "") {
            stmt['context']['statement']['id'] = contextStatement;
            stmt['context']['statement']['objectType'] = "Group";
        }
    }

    if ( attachmentDisplay != "" || attachmentDescription != "" || attachmentLanguage != "" || attachmentContentType != "" || attachmentLength != "" || attachmentSha2 != "" ||attachmentFileURL != "" ) {
      stmt['attachments'] = [];
      var attachment = {};
      attachment['usageType'] = attachmentUsageType;
      if (attachmentDisplay != "" && attachmentLanguage != "") {
          attachment['display'] = {};
          attachment['display'][attachmentLanguage] = attachmentDisplay;
      }
      if (attachmentDescription != "" && attachmentLanguage != "") {
          attachment['description'] = {};
          attachment['description'][attachmentLanguage] = attachmentDescription;
      }      
      attachment['contentType'] = attachmentContentType;
      attachment['length'] = parseInt(attachmentLength);
      attachment['sha2'] = attachmentSha2;
      if (attachmentFileURL != "") { attachment['fileUrl'] = attachmentFileURL; }
      stmt['attachments'].push(attachment);
    }

    //console.log(stmt);
    return stmt;
}

// Validate JSON
function validateJSON(json) {
    try {
        var c = $.parseJSON(json);
        return true;
    } catch (err) {
        return err;
    }
}


/*  Statement Manipulation and Response -- Sending */

// Generate statement and preview in the editor
function previewStatement() {
    var stmt = buildStatement();

    editor.setValue(JSON.stringify(stmt, undefined, 4)); // or session.setValue
    editor.clearSelection(); // or session.setValue
}

// Send statement to the LRS
function sendStatement() {
    setupConfig();

    var stmt = editor.getValue(); // or session.getValue

    if (validateJSON(stmt) != true) { // JSON is invalid
        $.growl({ title: "invalid JSON, cannot send" }, notificationErrorSettings);
        return false;
    }

    var xstmt = $.parseJSON(stmt);

    ADL.XAPIWrapper.sendStatement(xstmt, function(r, obj) {
        console.log(r);
        //console.log(obj);
        // notification
        if (r.status == 200) {
            $.growl({ title: "Status " + r.status + " " + r.statusText + ": ", message: "<b><em>" + xstmt.verb.display['en-US'] + "</em></b> statement sent successfully to LRS" }, notificationSettings);
        }
        var prettyStatement = styleStatementView(xstmt.id, xstmt);
        $("#sent-statements").append(prettyStatement);
        PR.prettyPrint();
    });
}

// Add valid statement to queue
function queueStatement(stmt) {
    var stmt = editor.getValue(); // or session.getValue

    if (validateJSON(stmt) != true) { // JSON is invalid
        $.growl({ title: "invalid JSON, cannot add to queue" }, notificationErrorSettings);
        return false;
    }
    
    var xstmt = $.parseJSON(stmt);

    var _stmt = new ADL.XAPIStatement(stmt);
    _stmt.generateId();
    stmts.push(xstmt);

    var prettyStatement = styleStatementView(_stmt.id, xstmt);
    $("#statement-queue").append(prettyStatement);
    PR.prettyPrint();
}

// Send statements from Queue to LRS
function sendStatementQueue() {
    setupConfig();

    //var xstmts = $.parseJSON(stmts);

    ADL.XAPIWrapper.sendStatements(stmts, function(r, obj) {
        //console.log(r);
        //console.log(obj);
        // notification
        if (r.status == 200) {
            $.growl({ title: "Status " + r.status + " " + r.statusText + ": ", message: "<b><em>Statement Queue</em></b> sent successfully to LRS" }, notificationSettings);
            //console.log(r, obj);

            var prettyStatement = styleStatementsView(obj[0], stmts);
            $("#sent-statements").append(prettyStatement);
            PR.prettyPrint();

            $("#statement-queue").html("");
            stmts = [];
        }
    });
}

// Clear Statements sent to the LRS
function clearSentStatements() {
    $("#sent-statements").html("");
}

// Clear Statements from Queue
function clearStatementQueue() {
    $("#statement-queue").html("");
    stmts = [];
}

// Pretty view of statements
function styleStatementView(id, stmt) {
    var rand = Math.random().toString(36).substr(2, 5);
    return '<div class="panel panel-info"><div class="panel-heading collapser"><h4 class="panel-title"><a data-toggle="collapse" data-target="#' + rand + id + '" href="#' + rand + id + '" class="collapsed">' + id + '</a></h4></div><div id="' + rand + id + '" class="panel-collapse collapse"><div class="panel-body"><pre class="prettyprint lang-js" >' + JSON.stringify(stmt, undefined, 4) + '</pre></div></div></div>';
}

// Pretty view of statements
function styleStatementsView(id, stmts) {
    var rand = Math.random().toString(36).substr(2, 5);
    return '<div class="panel panel-primary"><div class="panel-heading collapser"><h4 class="panel-title"><a data-toggle="collapse" data-target="#' + rand + id + '" href="#' + rand + id + '" class="collapsed">Group ' + id + " [" + stmts.length + "]" + '</a></h4></div><div id="' + rand + id + '" class="panel-collapse collapse"><div class="panel-body"><pre class="prettyprint lang-js" >' + JSON.stringify(stmts, undefined, 4) + '</pre></div></div></div>';
}


/*  Statement Manipulation and Response -- Receiving */

// Retreive statements from the LRS
function getStatementsWithSearch() {
    setupConfig();

    var verbSort = $("#search-verb-sort").val();
    var verbId = $("#search-user-verb-id").val();
    var actorEmail = $("#search-actor-email").val();
    var activityId = $("#search-activity-id").val();
    var relatedAgents = $("#search-related-agents").val();
    var relatedActivities = $("#search-related-activities").val();
    var registrationId = $("#search-registration-id").val();
    var statementId = $("#search-statement-id").val();
    var voidedStatementId = $("#search-voided-statement-id").val();
    var sinceDate = $("#search-statements-since-date input").val();
    var untilDate = $("#search-statements-until-date input").val();
    var limit = $("#search-limit").val();

    // Build Search
    var search = ADL.XAPIWrapper.searchParams();
    if (verbId != "") { search['verb'] = verbId; }
    if (verbSort != "") { search['ascending'] = verbSort; }
    if (actorEmail != "") { search['agent'] = JSON.stringify({ "mbox": "mailto:" + actorEmail}); }
    if (activityId != "") { search['activity'] = activityId; }
    if (relatedAgents != "") { search['related_agents'] = relatedAgents; }
    if (relatedActivities != "") { search['related_activities'] = relatedActivities; }
    if (registrationId != "") { search['registration'] = registrationId; }
    if (statementId != "") { search['statementId'] = statementId; }
    if (voidedStatementId != "") { search['voidedStatementId'] = voidedStatementId; }
    if (sinceDate != "") { search['since'] = sinceDate; }
    if (untilDate != "") { search['until'] = untilDate; }
    if (limit != "") { search['limit'] = limit; }
    //console.log(search);

    ADL.XAPIWrapper.getStatements(search, null, function(r) {
        //console.log(r);
        var response = $.parseJSON(r.response);

        // notification
        if (r.status == 200) {

            // Handle case where only a single statement is returned
            // using statementId or voidedStatementId
            if (response.hasOwnProperty('statements')) {
                var stmts = response.statements;
                var length = stmts.length;
            } else {
                var stmt = response;
                var length = 1;
            }

            $.growl({ title: "Status " + r.status + " " + r.statusText + ": ", message: "statements received successfully from LRS" }, notificationSettings);

            if (length > 0) {
                if (stmt) {
                    var prettyStatement = styleStatementView(stmt.id, stmt);
                } else {
                    var prettyStatement = styleStatementsView(stmts[0].id, stmts);
                }
                $("#received-statements").append(prettyStatement);
                PR.prettyPrint();
            }
        }
    });
}

// Clear Statements received from the LRS
function clearReceivedStatements() {
    $("#received-statements").html("");
}


/*  Document Manipulation and Response -- Sending */

// Send State to the LRS
function sendState() {
    setupConfig();

    var activityId = $("#document-activity-id").val();
    var actorEmail = $("#document-actor-email").val(); // TODO: Agent
    var stateId = $("#set-document-state-id").val();
    // registration    
    var stateValue = $("#set-document-state-string").val();
    // matchHash
    // noneMatchHash
    // callback

    ADL.XAPIWrapper.sendState(activityId, {"mbox":"mailto:" + actorEmail}, stateId, null, stateValue, null, null, function(r) {
        $.growl({ title: "Status " + r.status + " " + r.statusText }, notificationSettings);
        $("#sent-documents").append("<p>Sent State <b>" + stateId + "</b>: " + stateValue + "</p>");
        console.log(r);
    });
}

// Sent Activity Profile to the LRS
function sendActivityProfile() {
    setupConfig();

    var activityId = $("#document-activity-id").val();
    var profileId = $("#set-document-activity-profile-id").val();
    var profileValue = $("#set-document-activity-profile-string").val();
    // matchHash
    // noneMatchHash
    // callback

    ADL.XAPIWrapper.sendActivityProfile(activityId, profileId, profileValue, null, null, function(r) {
        $.growl({ title: "Status " + r.status + " " + r.statusText }, notificationSettings);
        $("#sent-documents").append("<p>Sent Activity Profile <b>" + profileId + "</b>: " + profileValue + "</p>");
        console.log(r);
    });
}

// Sent Activity Profile to the LRS
function sendAgentProfile() {
    setupConfig();

    var actorEmail = $("#document-actor-email").val(); // TODO: Agent
    var profileId = $("#set-document-agent-profile-id").val();
    var profileValue = $("#set-document-agent-profile-string").val();
    // matchHash
    // noneMatchHash
    // callback

    ADL.XAPIWrapper.sendAgentProfile({"mbox":"mailto:" + actorEmail}, profileId, profileValue, null, "*", function(r) {
        $.growl({ title: "Status " + r.status + " " + r.statusText }, notificationSettings);
        $("#sent-documents").append("<p>Sent Agent Profile <b>" + profileId + "</b>: " + profileValue + "</p>");
        console.log(r);
    });
}

function clearSentDocuments() {
    $("#sent-documents").html("");
}



/*  Document Manipulation and Response -- Receiving */

// Get State from the LRS
function getState() {
    setupConfig();

    var activityId = $("#document-activity-id").val();
    var actorEmail = $("#document-actor-email").val(); // TODO: Agent
    var stateId = $("#get-document-state-id").val();
    // registration
    var since = $("#get-document-since-date input").val();
    var sinceDate = (since == "") ? null : new Date(since);
    // callback

    ADL.XAPIWrapper.getState(activityId, {"mbox":"mailto:" + actorEmail}, stateId, null, sinceDate, function(r) {
        $.growl({ title: "Status " + r.status + " " + r.statusText }, notificationSettings);
        $("#received-documents").append("<p>Received State <b>" + stateId + "</b>: " + r.response + "</p>");
        console.log(r);
    });
}

// Get Activity Profile from the LRS
function getActivityProfile() {
    setupConfig();

    var activityId = $("#document-activity-id").val();
    var profileId = $("#get-document-activity-profile-id").val();
    var since = $("#get-document-since-date input").val();
    var sinceDate = (since == "") ? null : new Date(since);
    // callback

    ADL.XAPIWrapper.getActivityProfile(activityId, profileId, sinceDate, function(r) {
        $.growl({ title: "Status " + r.status + " " + r.statusText }, notificationSettings);
        $("#received-documents").append("<p>Received Activity Profile <b>" + profileId + "</b>: " + r.response + "</p>");
        console.log(r);
    });
}

// Get Agent Profile from the LRS
function getAgentProfile() {
    setupConfig();

    var actorEmail = $("#document-actor-email").val(); // TODO: Agent
    var profileId = $("#get-document-agent-profile-id").val();
    var since = $("#get-document-since-date input").val();
    var sinceDate = (since == "") ? null : new Date(since);
    // callback

    ADL.XAPIWrapper.getAgentProfile({"mbox":"mailto:" + actorEmail}, profileId, sinceDate, function(r) {
        $.growl({ title: "Status " + r.status + " " + r.statusText }, notificationSettings);
        $("#received-documents").append("<p>Received Agent Profile <b>" + profileId + "</b>: " + r.response + "</p>");
        console.log(r);
    });
}

function clearReceivedDocuments() {
    $("#received-documents").html("");
}


/*  Document Manipulation and Response -- Deleting */

// Delete State from the LRS
function deleteState() {
    setupConfig();

    var activityId = $("#document-activity-id").val();
    var actorEmail = $("#document-actor-email").val(); // TODO: Agent
    var stateId = $("#delete-document-state-id").val();
    // registration
    // matchHash
    // noneMatchHash
    // callback

    ADL.XAPIWrapper.deleteState(activityId, {"mbox":"mailto:" + actorEmail}, stateId, null, null, null, function(r) {
        $.growl({ title: "Status " + r.status + " " + r.statusText }, notificationSettings);
        if (r.status == 204) {
            $("#deleted-documents").append("<p>Deleted State: <b>" + stateId + "</b></p>");
        }
        console.log(r);
    });
}

// Delete Activity Profile from the LRS
function deleteActivityProfile() {
    setupConfig();

    var activityId = $("#document-activity-id").val();
    var profileId = $("#delete-document-activity-profile-id").val();
    // matchHash
    // noneMatchHash
    // callback

    ADL.XAPIWrapper.deleteActivityProfile(activityId, profileId, null, null, function(r) {
        $.growl({ title: "Status " + r.status + " " + r.statusText }, notificationSettings);
        if (r.status == 204) {
            $("#deleted-documents").append("<p>Deleted Activity Profile: <b>" + profileId + "</b></p>");
        }
        console.log(r);
    });
}

// Delete Agent Profile from the LRS
function deleteAgentProfile() {
    setupConfig();

    var actorEmail = $("#document-actor-email").val(); // TODO: Agent
    var profileId = $("#delete-document-agent-profile-id").val();
    // matchHash
    // noneMatchHash
    // callback

    ADL.XAPIWrapper.deleteAgentProfile({"mbox":"mailto:" + actorEmail}, profileId, null, null, function(r) {
        $.growl({ title: "Status " + r.status + " " + r.statusText }, notificationSettings);
        $("#deleted-documents").append("<p>" + r.response + "</p>");
        if (r.status == 204) {
            $("#deleted-documents").append("<p>Deleted Agent Profile: <b>" + profileId + "</b></p>");
        }
    });
}

function clearDeletedDocuments() {
    $("#deleted-documents").html("");
}
