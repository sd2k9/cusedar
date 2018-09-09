/* Parts of this software stem from Reply as Original Recipient.
 *  These are subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * All changes introduced afterwards are dual-licensed under both
 * GNU General Public License version 3.0 and
 * Mozilla Public License version 2.0 .
 *
 * See README.md for more details.
 */

/* Adapted from the Reply to All as Cc extension (v1.4) */

/* Origin of this file: reply_as_original_recipient version 1.0
   Homepage: http://blog.qiqitori.com/?p=194
   Source:
    reply_as_original_recipient-1.0-tb.xpi
    https://addons.mozilla.org/en-US/thunderbird/addon/reply-as-original-recipient/
*/


var ReplyAsOriginalRecipient = {
  isReply: function() {
    /* Is this a reply? */
    composeType = gMsgCompose.type;
    availableComposeTypes = Components.interfaces.nsIMsgCompType
    return (composeType == availableComposeTypes.ReplyToSender || // normal reply
            composeType == availableComposeTypes.Reply || // dunno
            composeType == availableComposeTypes.ReplyAll) // reply to all
  },

  getMessageHeaderFromURI: function(aURI) {
    return Components.classes['@mozilla.org/messenger;1']
                     .getService(Components.interfaces.nsIMessenger)
                     .msgHdrFromURI(aURI);
  },

  setSender: function(name) {
    /* Set the sender of this mail to name */
    /* Adapted from mail/components/compose/content/MsgComposeCommands.js */
    let customizeMenuitem = document.getElementById("cmd_customizeFromAddress");
    customizeMenuitem.setAttribute("disabled", "true");
    customizeMenuitem.setAttribute("checked", "true");
    let identityElement = document.getElementById("msgIdentity");
    identityElement.removeAttribute("type");
    identityElement.editable = true;
    identityElement.focus(); // if we don't do this, we won't be able to send off our email. sounds odd but it's true
    identityElement.value = name;
    identityElement.select();
  },

  init: function() {
    /* This will be checked by fid to disable flexible identity replacement when
	 raor already replaced the From field (when success == true) */
    this.success = false;  /* Initially set to false */
    // Extra Debug (disabled)
    // (Components.utils.import("resource://gre/modules/Console.jsm", {})).console.log("DEBUG raor: success = ", this.success);

    if (!this.isReply())
      return;

    /* Get all preferences, catch exception and report it (e.g. preference not existing) */
    let pref_debug;
    let pref_enable;
    let pref_cc;
    let pref_regexp;
    let pref_sendername;
    try {
	let prefs = Components.classes['@mozilla.org/preferences-service;1'].
        getService(Components.interfaces.nsIPrefBranch);

	pref_debug  = prefs.getBoolPref('extensions.fid.debug.console');
        pref_enable = prefs.getBoolPref('extensions.fid.reply.enable');
	pref_cc     = prefs.getBoolPref('extensions.fid.reply.checkcc');
	pref_regexp = prefs.getCharPref('extensions.fid.reply.regexp');
	pref_sendername = prefs.getCharPref('extensions.fid.reply.sendername');
    } catch (ex) {Components.utils.reportError(ex);}

    /* Debug Console Output */
    let console = null;
    if (pref_debug)
	console = (Components.utils.import("resource://gre/modules/Console.jsm", {})).console;
    // console.log("Hello Log World");
    // dump dumps to Terminal; ok isn't it?
    // dump("Hello Dump2 World\n");
    // window.dump("Hello Window Dump2 World\n");

    if (!pref_enable) {
	if (pref_debug)
	    console.log("DEBUG raor: Reply handling disabled by configuration, doing nothing");
	return;
    }

    /* Get original recipient */
    let originalHeader = this.getMessageHeaderFromURI(gMsgCompose.originalMsgURI);
    let originalRecipient = originalHeader.mime2DecodedRecipients;  /* Fetch "To" header */
    /* Debug Output */
    if (pref_debug)
	console.log("DEBUG raor: originalHeader.mime2DecodedRecipients = ", originalRecipient);
    if (pref_regexp.length == 0) {
	if (pref_debug)
	    console.log("DEBUG raor: Using default matching with +");
	/* Default: Check for "+" in original recipient, does not allow multiple addresses (",") */
	if (originalRecipient.indexOf(",") != -1 || originalRecipient.indexOf("+") == -1) {
	    if (pref_debug)
		console.log("DEBUG raor: No default match found - bailing out\n");
	    return;
	}
    } else {  /* if (pref_regexp.length == 0) */
        /* Use regexp from config dialog */
	let re_recipient = new RegExp(pref_regexp, "i");
	let match_recv = null;  /* String we're matching with */
	if (pref_debug)
	    console.log("DEBUG raor: Using regex for case insensitive match = ", pref_regexp);
	if (originalRecipient.search(re_recipient) >= 0) {  /* First try recipient */
	    if (pref_debug)
		console.log("DEBUG raor: regex found in recipient\n");
	    match_recv = originalRecipient;
	} else if (pref_cc) {
	    let originalCcList = originalHeader.ccList;  /* Fetch CC header */
	    if (pref_debug) {
		console.log("DEBUG raor: Check also CC list (enabled in configuration)\n");
		console.log("DEBUG raor: originalHeader.ccList = ", originalCcList);
	    }
	    if (originalCcList.search(re_recipient) >= 0) {  /* Secondary try CC list */
		if (pref_debug)
		    console.log("DEBUG raor: regex found in CC list\n");
		match_recv = originalCcList;
	    }
	}
	if (match_recv == null) {   /* No match found, so we're done here */
	    if (pref_debug)
		console.log("DEBUG raor: regex NOT found in recipient or CC (when enabled) - bailing out\n");
	    return;
	}
	/* Filter out first match, according to match string */
	let re_result = re_recipient.exec(match_recv);
	if (re_result == null) {  /* This should not happen, something went wrong */
	    if (pref_debug)
		console.error("ERROR: regex exec for recipient failed after search succeeded before",
			      " - Something went wrong here!");
	    return;
	}
	/* Use match, correct format */
	let sendername = null;
	if (pref_sendername.length > 0) /* Sender name from configuration */
	    sendername = pref_sendername;
	/* else: No sender name configured */
	originalRecipient = MailServices.headerParser.makeMailboxObject(
            sendername, re_result[0]).toString()
    }  /* if (pref_regexp.length == 0) */
    if (pref_debug)
	console.log("DEBUG raor: Success RE Recipient Isolated = ", originalRecipient);

    this.setSender(originalRecipient);   /* Now update the sender */
    /* This will be checked by fid to disable flexible identity replacement when
	 raor already replaced the From field (when success == true) */
    this.success = true;  /* Now change it to true, because we did run */

    /* Return focus to editor */
    let contentFrame = document.getElementById("content-frame");
    contentFrame.focus();
  },

  handleEvent: function(aEvent) {
    switch (aEvent.type) {
      case 'compose-window-init':
        document.documentElement.addEventListener('compose-window-close', this, false);
        window.addEventListener('unload', this, false);
        gMsgCompose.RegisterStateListener(this);
        return;

      case 'compose-window-close':
        gMsgCompose.UnregisterStateListener(this);
        return;

      case 'unload':
        document.documentElement.removeEventListener('compose-window-init', this, false);
        document.documentElement.removeEventListener('compose-window-close', this, false);
        window.removeEventListener('unload', this, false);
        return;
    }
  },

  // nsIMsgComposeStateListener
  NotifyComposeFieldsReady: function() {
    // do it after all fields are constructed completely.
    this.init();
  },
  NotifyComposeBodyReady: function() {},
  ComposeProcessDone: function() {},
  SaveInFolderDone: function() {}
};

document.documentElement.addEventListener('compose-window-init', ReplyAsOriginalRecipient, false);
