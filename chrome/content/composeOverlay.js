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

    /* Get original recipient */
    originalHeader = this.getMessageHeaderFromURI(gMsgCompose.originalMsgURI);
    originalRecipient = originalHeader.mime2DecodedRecipients;
    if (originalRecipient.indexOf(",") != -1 || originalRecipient.indexOf("+") == -1)
      return;

    /* Adapted from mail/components/compose/content/MsgComposeCommands.js */
    var customizeMenuitem = document.getElementById("cmd_customizeFromAddress");
    customizeMenuitem.setAttribute("disabled", "true");
    customizeMenuitem.setAttribute("checked", "true");
    var identityElement = document.getElementById("msgIdentity");
    identityElement.removeAttribute("type");
    identityElement.editable = true;
    identityElement.focus(); // if we don't do this, we won't be able to send off our email. sounds odd but it's true
    identityElement.value = originalRecipient;
    identityElement.select();

    /* Return focus to editor */
    var contentFrame = document.getElementById("content-frame");
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
