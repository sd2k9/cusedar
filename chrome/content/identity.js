/*
  Parts of this software stem from Flexible Identity.
  These are subject to the terms of the GNU General Public License
  version 3.
        This program is free software: you can redistribute it and/or modify
        it under the terms of the GNU General Public License version 3
        as published by the Free Software Foundation.

        This program is distributed in the hope that it will be useful,
        but WITHOUT ANY WARRANTY; without even the implied warranty of
        MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
        GNU General Public License for more details.

        You should have received a copy of the GNU General Public License
        along with this program.  If not, see <https://www.gnu.org/licenses/>.

  All changes introduced afterwards are dual-licensed under both
  GNU General Public License version 3.0 and
  Mozilla Public License version 2.0 .


  See README.md for more details.
*/

var cusedarIdentity = {

onLoad: function() {

    /* Debug logger - print when not-null */
    this.console = null;
    let pref_debug = null;
    try {
	let prefs = Components.classes['@mozilla.org/preferences-service;1'].
            getService(Components.interfaces.nsIPrefBranch);
	pref_debug  = prefs.getBoolPref('extensions.cusedar.debug.console');
	if (pref_debug)  /* We want to print, so we fetch the console */
	    this.console = (Components.utils.import("resource://gre/modules/Console.jsm", {})).console;
    } catch (ex) {Components.utils.reportError(ex);}

    try {
        this.ro = new cusedarRules(pref_debug);  /* C'tor with debug console */
        this.embedIntoCompose();
	this.raor = null;          /* Reference to raor */
	if ('ReplyAsOriginalRecipient' in window)
	    this.raor = window.ReplyAsOriginalRecipient;
	else /* something went wrong, but just report it */
	    if (this.console)
		this.console.error("ERROR cusedar: Did not found ReplyAsOriginalRecipient in window object!");
    } catch (ex) {Components.utils.reportError(ex);}
},

showOptions: function() {
    var res = {};
    window.openDialog('chrome://cusedar/content/options.xul', '', 'chrome,centerscreen,modal,resizable', res);
},

embedIntoCompose: function() {
    var cusedar_SendMessageWithCheck = SendMessageWithCheck;
    var cusedar_SendMessage = SendMessage;
    var cusedar_SendMessageLater = SendMessageLater;
    var cusedar_GenericSendMessage = GenericSendMessage;

    window.SendMessageLater = function () {
        cusedarIdentity.checkAndSend(cusedar_SendMessageLater);
    };

    window.SendMessageWithCheck = function () {
        cusedarIdentity.checkAndSend(cusedar_SendMessageWithCheck);
    };

    window.SendMessage = function () {
        cusedarIdentity.checkAndSend(cusedar_SendMessage);
    };

    window.GenericSendMessage = function(msgType) {
        cusedarIdentity.genericSend(msgType, cusedar_GenericSendMessage);
    }
},

checkAndSend: function(aCallback) {
    try {
	if ( (! this.raor) || (this.raor.success == false) ) {
	    /* Only check for replacement when raor did not already replaced the sender */
            if (!this.checkCC())
		return;
            if (!this.checkRules(true))
		return;
	} else if (this.console) { /* Debug output when requested */
	    this.console.log("DEBUG cusedar: No action, because cusedar/raor did ran (1)");
	}
    } catch(ex) {Components.utils.reportError(ex);}

    aCallback();
},

getRecipients: function() {
    let res = [];
    let i = 0;
    let curTo = '';

    while (true) {
        i++;

        try {
            if ((curTo = document.getElementById('addressCol2#' + i).
                value.toLowerCase()) != '') {
                curTo.replace(' ', '');
                let temp1 = curTo.indexOf('<');
                let temp2 = curTo.indexOf('>');

                if (temp1 != -1 && temp2 != -1)
                    curTo = curTo.substring(temp1 + 1, temp2);

                let type = document.getElementById('addressCol1#' + i).value.toLowerCase();

                res.push({email: curTo, type: type});
            }
        } catch(ex) {break;}
    }

    return res;
},

checkRules: function(willSend) {
    /* Get Options */
    let pref_sendername;
    let pref_addrbook;
    try {
	let prefs = Components.classes['@mozilla.org/preferences-service;1'].
            getService(Components.interfaces.nsIPrefBranch);
	pref_sendername = prefs.getCharPref('extensions.cusedar.reply.sendername');
	pref_addrbook = prefs.getBoolPref('extensions.cusedar.addressbook');
    } catch (ex) {Components.utils.reportError(ex);}

    let abfrom = null;   /* Fill with addressbook from when found */
    let recpts = this.getRecipients();  /* Cache recipients */

    if (pref_addrbook) {
	/* When enabled, first check the adress book */
	abfrom = this.ro.matchAddrbook(recpts);
	if (this.console) {
	    this.console.log("DEBUG cusedar: addrbook lookup returned = ", abfrom);
	}
    } /* if (prefs.getBoolPref('extensions.cusedar.addressbook')) */

    if (abfrom != null) {
	if (this.console) {
	    this.console.log("DEBUG cusedar: Use addrbook lookup to update sender");
	}
	try {
	    let sendername = null;
	    /* If the addressbook match contains "<" and ">" then we assume it's
	       an address with sender name included, e.g.: Sender <mail@domain.org> */
	    if ( (abfrom.indexOf("<") != -1) && (abfrom.indexOf(">") != -1) &&
	         (abfrom.indexOf("<") < abfrom.indexOf(">")) ) {
		if (this.console) {
		    this.console.log("DEBUG cusedar: Do not set sender, assuming it's part of Custom3");
		}
	    } else if (pref_sendername.length > 0) /* Sender name from configuration */
		sendername = pref_sendername;
	    this.raor.setSender(
		MailServices.headerParser.makeMailboxObject(
		    sendername, abfrom).toString() );
	} catch(ex) {Components.utils.reportError(ex);}
    } else {
	/* Try lookup in custom rules */
	let cmb = document.getElementById('msgIdentity');
	/* First check the stored rules */
	let idx = this.ro.match(recpts);

	/* Debug Console Output */
	if (this.console)
	    this.console.log("DEBUG cusedar: idx = ", idx);

	if (idx != -1) {
	    /* We got a rules match! */
            let r = this.ro.rules[idx];
            let key = r.account;
            let useAttr = cmb.selectedItem.hasAttribute('identitykey');
            let from = useAttr ? cmb.selectedItem.getAttribute('identitykey') : cmb.value;
	    if (this.console) {
		this.console.log("DEBUG cusedar: key = ", key);
		this.console.log("DEBUG cusedar: from = ", from);
	    }
            let fixError = true;

            if (key != from && key) {
		if (!r.noWarning && willSend) {
                    let msg = this.ro.bundle.formatStringFromName(
			'ruleWarning',
			[this.ro.mgr.getIdentity(from).identityName,
			 this.ro.mgr.getIdentity(key).identityName], 2);

                    let prompts = Components.classes['@mozilla.org/embedcomp/prompt-service;1'].
			getService(Components.interfaces.nsIPromptService);

                    var check = {value: false};

                    let ask = prompts.confirmEx(window,
			this.ro.bundle.GetStringFromName('ruleWarnCaption'),
			msg,
			prompts.BUTTON_POS_0 * prompts.BUTTON_TITLE_IS_STRING +
                        prompts.BUTTON_POS_1 * prompts.BUTTON_TITLE_CANCEL +
                        prompts.BUTTON_POS_2 * prompts.BUTTON_TITLE_IS_STRING +
                        prompts.BUTTON_POS_1_DEFAULT,
			this.ro.bundle.GetStringFromName('ruleWarnSend'),
                        '',
                        this.ro.bundle.GetStringFromName('ruleWarnCorrect'),
                        null,
                        check);

                    if (ask === 1)
			return false;

                    fixError = ask === 2;
		}

		if (fixError) {
                    if (useAttr) {
			let identity = this.ro.mgr.getIdentity(key);
			cmb.value = MailServices.headerParser.makeMailboxObject(
                            identity.fullName, identity.email).toString();
			if (this.console)
			    this.console.log("DEBUG cusedar: Update cmb.value = makeMailboxObject = ", cmb.value);
                    } else {
			cmb.value = key;
			if (this.console)
			    this.console.log("DEBUG cusedar: Update cmb.value = key = ", cmb.value);
		    }

                    LoadIdentity(false); // thanks to Bruce Jolliffe
		}
            }
	} /* if (idx != -1) { */
    } /* if (abfrom != null) */
    return true;
},

checkCC: function() {
    let prefs = Components.classes['@mozilla.org/preferences-service;1'].
        getService(Components.interfaces.nsIPrefBranch);

    if (!prefs.getBoolPref('extensions.cusedar.check.cc'))
        return true;

    let i = 0;
    let found = false;

    while (true) {
        i++;

        try {
            let type = document.getElementById('addressCol1#' + i).value.toLowerCase();

            if (type !== 'addr_cc' && type !== 'addr_bcc' && type !== '' &&
                document.getElementById('addressCol2#' + i).value.toLowerCase() !== '') {
                found = true;
                break;
            }
        } catch(ex) {break;}
    }

    if (found)
        return true;

    let prompts = Components.classes['@mozilla.org/embedcomp/prompt-service;1'].
        getService(Components.interfaces.nsIPromptService);

    var check = {value: false};

    let ask = prompts.confirmEx(window,
        this.ro.bundle.GetStringFromName('ccWarnCaption'),
        this.ro.bundle.GetStringFromName('ccWarning'),
        prompts.BUTTON_POS_0 * prompts.BUTTON_TITLE_IS_STRING +
            prompts.BUTTON_POS_1 * prompts.BUTTON_TITLE_CANCEL +
            prompts.BUTTON_POS_1_DEFAULT,
        this.ro.bundle.GetStringFromName('ccWarnSend'),
        '',
        '',
        this.ro.bundle.GetStringFromName('ccWarnCheck'),
        check);

    if (check.value) {
        prefs.setBoolPref('extensions.cusedar.check.cc', false);
    }

   return ask !== 1;
},

genericSend: function(aType, aCallback) {
    try {
	if ( (! this.raor) || (this.raor.success == false) ) {
	    /* Only check for replacement when raor did not already replaced the sender */
            if (aType == nsIMsgCompDeliverMode.SaveAsDraft && !this.checkDraft())
		return;
	} else if (this.console) { /* Debug output when requested */
	    this.console.log("DEBUG cusedar: No action, because cusedar/raor did ran (2)");
	}
    } catch(ex) {Components.utils.reportError(ex);}

    aCallback(aType);
},

checkDraft: function() {
    if ( (! this.raor) || (this.raor.success == false) ) {
	/* Only check for replacement when raor did not already replaced the sender */
	let prefs = Components.classes['@mozilla.org/preferences-service;1'].
            getService(Components.interfaces.nsIPrefBranch);
	return prefs.getBoolPref('extensions.cusedar.check.draft') ?
            this.checkRules(false) : true;
    } else if (this.console) { /* Debug output when requested */
	this.console.log("DEBUG cusedar: No action, because cusedar/raor did ran (3)");
	return true;
    }
},

} // cusedarOptions

window.addEventListener('load', function() {cusedarIdentity.onLoad();}, false);
