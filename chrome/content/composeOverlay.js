/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

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

  init: function() {
    if (!this.isReply())
      return;


    /* Debug Console Output */
    // abc
    // Components.utils.import("resource://gre/modules/Console.jsm");
    let console = (Components.utils.import("resource://gre/modules/Console.jsm", {})).console;
    // console.log("Hello Log World");
    // dump dumps to Terminal; ok isn't it?
    // dump("Hello Dump2 World\n");
    // window.dump("Hello Window Dump2 World\n");

    /* Get original recipient */
    let originalHeader = this.getMessageHeaderFromURI(gMsgCompose.originalMsgURI);
    let originalRecipient = originalHeader.mime2DecodedRecipients;  /* Fetch "To" header */
    let originalCcList = originalHeader.ccList;  /* Fetch CC header */
    /* Debug Output */
    console.log("DEBUG: originalHeader.mime2DecodedRecipients = ", originalRecipient);
    console.log("DEBUG: originalHeader.ccList = ", originalCcList);
    /* Default: Check for "+" in original recipient, does not allow multiple addresses (",") */
    /* TODO: Commented out until configuration added */
    /*
    if (originalRecipient.indexOf(",") != -1 || originalRecipient.indexOf("+") == -1)
      return;
    */

    let re_recipient = /abc-[\w\d]+@example.org/i;
    let match_recv = null;  /* String we're matching with */
    /* Match Template: abc-tst@example.org, abc-tst2@example.org */
    if (originalRecipient.search(re_recipient) >= 0) {  /* First try recipient */
	console.log("DEBUG: RE found in recipient\n");
	match_recv = originalRecipient;
    } else if (originalCcList.search(re_recipient) >= 0) {  /* Secondary try CC list */
	console.log("DEBUG: RE found in CC list\n");
	match_recv = originalCcList;
    } else {
	console.log("DEBUG: RE NOT found in recipient or CC - bailing out\n");
	return;
    }
    /* Filter out first match, according to match string */
    let re_result = re_recipient.exec(match_recv);
    if (re_result == null) {  /* This should not happen, something went wrong */
	console.error("ERROR: RE Exec for recipient failed after search succeeded before",
	" - Something went wrong here!");
	return;
    }
    originalRecipient = re_result[0];      /* Use match */
    console.log("DEBUG: RE Recipient Isolated = ", originalRecipient);

    /* Adapted from mail/components/compose/content/MsgComposeCommands.js */
    let customizeMenuitem = document.getElementById("cmd_customizeFromAddress");
    customizeMenuitem.setAttribute("disabled", "true");
    customizeMenuitem.setAttribute("checked", "true");
    let identityElement = document.getElementById("msgIdentity");
    identityElement.removeAttribute("type");
    identityElement.editable = true;
    identityElement.focus(); // if we don't do this, we won't be able to send off our email. sounds odd but it's true
    identityElement.value = originalRecipient;
    identityElement.select();

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
