var fidOptions = {

onLoad: function() {
    try {
        this.ro = new fidRules();
        this.lb = document.getElementById('id-rules');
        this.idx = -1;
        this.fillIds();
        this.fillRules();
        this.fillPrefs();
    } catch (ex) {Components.utils.reportError(ex);}
},

fillIds: function() {
    let mgr = Components.classes['@mozilla.org/messenger/account-manager;1'].
        getService(Components.interfaces.nsIMsgAccountManager);

    let accounts = this.queryArray(mgr.accounts, Components.interfaces.nsIMsgAccount);
    let menulist = document.getElementById('id-identity');
    accounts = accounts.filter(function(a) {return !!a.incomingServer;});

    for each (let account in accounts) {
        let identites = this.queryArray(account.identities, Components.interfaces.nsIMsgIdentity);

        for each (let identity in identites)
            if (identity.email)
                menulist.appendItem(identity.identityName, identity.key, '');
    }

    menulist.selectedIndex = 0;
},

queryArray: function(supportsArray, iid) {
    let isArr = supportsArray instanceof Components.interfaces.nsIArray;
    let result = [], count = isArr ? supportsArray.length : supportsArray.Count();

    for (let n = 0; n < count; ++n)
        result.push(isArr ? supportsArray.queryElementAt(n, iid) : supportsArray.QueryElementAt(n, iid));

    return result;
},

fillRules: function() {
    for each (let r in this.ro.rules)
        this.appendRule(r);

    this.lb.selectedIndex = 0;
    this.updateButtons();
},

doSelect: function() {
    let newIdx = this.lb.selectedIndex;
    let r = newIdx == -1 ? this.ro.emptyRule() : this.ro.rules[newIdx];
    let rbox = document.getElementById('id-rule');
    let sbox = document.getElementById('id-scope');
    let wbox = document.getElementById('id-warn');
    let ibox = document.getElementById('id-identity');
    let rxbox = document.getElementById('id-regex');
    let scbox = document.getElementById('id-skip-cc');
    let sbbox = document.getElementById('id-skip-bcc');

    if (this.idx != -1) {
        let old = this.ro.rules[this.idx];

        old.name = rbox.value;
        old.scope = sbox.value;
        old.noWarning = !wbox.checked;
        old.account = ibox.value;
        old.useRegex = rxbox.checked;
        old.skipCC = scbox.checked;
        old.skipBCC = sbbox.checked;
    }

    if (this.idx == newIdx)
        return;

    rbox.value = r.name;
    sbox.value = r.scope;
    wbox.checked = !r.noWarning;
    rxbox.checked = r.useRegex;
    scbox.checked = r.skipCC;
    sbbox.checked = r.skipBCC;

    if (r.account)
        ibox.value = r.account;
    else
        ibox.selectedIndex = 0;

    this.idx = newIdx;
    this.updateButtons();
},

doAdd: function() {
    let li = this.appendRule(this.ro.createRule());
    this.lb.selectItem(li);
    this.lb.ensureElementIsVisible(li);
    document.getElementById('id-rule').focus();
},

doRemove: function() {
    let idx = this.lb.selectedIndex;

    if (idx == -1)
        return;

    this.idx = -1;
    this.ro.rules.splice(idx, 1);
    this.lb.removeItemAt(idx);
    this.lb.selectedIndex = Math.min(idx, this.lb.getRowCount() - 1);
    this.lb.focus();
},

updateButtons: function() {
    let idx = this.lb.selectedIndex;
    let dis = idx == -1;
    let cnt = this.lb.getRowCount();

    document.getElementById('id-remove').disabled = dis;
    document.getElementById('id-rule').disabled = dis;
    document.getElementById('id-scope').disabled = dis;
    document.getElementById('id-identity').disabled = dis;
    document.getElementById('id-warn').disabled = dis;
    document.getElementById('id-up').disabled = cnt < 2 || idx == 0;
    document.getElementById('id-down').disabled = cnt < 2 || idx == cnt - 1;
},

appendRule: function(r) {
    return this.lb.appendItem(r.name, '');
},

doUpdateCaption: function() {
    this.lb.selectedItem.label = document.getElementById('id-rule').value;
},

doAccept: function() {
    try {
        this.doSelect();
        this.ro.save();
        this.savePrefs();
    } catch (ex) {Components.utils.reportError(ex);}

    try {
        let wm = Components.classes['@mozilla.org/appshell/window-mediator;1'].
            getService(Components.interfaces.nsIWindowMediator).getEnumerator(null);

        while(wm.hasMoreElements()) {
            let win = wm.getNext();

            if ('fidIdentity' in win)
                win.fidIdentity.ro.load();
        }
    } catch(ex) {Components.utils.reportError(ex);}

    window.close();
},

doUp: function() {
    this.idx = -1;
    let idx = this.lb.selectedIndex;

    if (idx < 1)
        return;

    let tmpItem = this.ro.rules[idx - 1];
    this.ro.rules[idx - 1] = this.ro.rules[idx];
    this.ro.rules[idx] = tmpItem;

    let item1 = this.lb.getItemAtIndex(idx - 1);
    let item2 = this.lb.getItemAtIndex(idx);

    let tmp = item1.label;
    item1.label = item2.label;
    item2.label = tmp;

    this.lb.selectedIndex = idx - 1;
    this.lb.focus();
},

doDown: function() {
    this.idx = -1;
    let idx = this.lb.selectedIndex;

    if (idx + 2 > this.lb.getRowCount())
        return;

    let tmpItem = this.ro.rules[idx];
    this.ro.rules[idx] = this.ro.rules[idx + 1];
    this.ro.rules[idx + 1] = tmpItem;

    let item1 = this.lb.getItemAtIndex(idx);
    let item2 = this.lb.getItemAtIndex(idx + 1);

    let tmp = item1.label;
    item1.label = item2.label;
    item2.label = tmp;

    this.lb.selectedIndex = idx + 1;
    this.lb.focus();
},

doTabs: function() {
    document.getElementById('id-manage').collapsed =
        document.getElementById('id-tabs').selectedIndex !== 0;
},

fillPrefs: function() {
    let prefs = Components.classes['@mozilla.org/preferences-service;1'].
       getService(Components.interfaces.nsIPrefBranch);

    document.getElementById('id-checkcc').checked        = prefs.getBoolPref('extensions.fid.check.cc');
    document.getElementById('id-checkdraft').checked     = prefs.getBoolPref('extensions.fid.check.draft');
    document.getElementById('id-showregexp').checked     = prefs.getBoolPref('extensions.fid.show.regexp');
    document.getElementById('id-debug-console').checked  = prefs.getBoolPref('extensions.fid.debug.console');

    document.getElementById('id-reply-enable').checked   = prefs.getBoolPref('extensions.fid.reply.enable');
    document.getElementById('id-reply-checkcc').checked  = prefs.getBoolPref('extensions.fid.reply.checkcc');
    document.getElementById('id-reply-regexp').value     = prefs.getCharPref('extensions.fid.reply.regexp');
    document.getElementById('id-reply-sendername').value = prefs.getCharPref('extensions.fid.reply.sendername');

    this.showOptFields();
},

savePrefs: function() {
    let prefs = Components.classes['@mozilla.org/preferences-service;1'].
       getService(Components.interfaces.nsIPrefBranch);

    prefs.setBoolPref('extensions.fid.check.cc', document.getElementById('id-checkcc').checked);
    prefs.setBoolPref('extensions.fid.check.draft', document.getElementById('id-checkdraft').checked);
    prefs.setBoolPref('extensions.fid.show.regexp', document.getElementById('id-showregexp').checked);
    prefs.setBoolPref('extensions.fid.debug.console', document.getElementById('id-debug-console').checked);

    prefs.setBoolPref('extensions.fid.reply.enable', document.getElementById('id-reply-enable').checked);
    prefs.setBoolPref('extensions.fid.reply.checkcc', document.getElementById('id-reply-checkcc').checked);
    prefs.setCharPref('extensions.fid.reply.regexp', document.getElementById('id-reply-regexp').value.trim());
    prefs.setCharPref('extensions.fid.reply.sendername', document.getElementById('id-reply-sendername').value.trim());
},

openURL: function(aURL) {
    var msg = Components.classes['@mozilla.org/messenger;1'].
        createInstance().QueryInterface(Components.interfaces.nsIMessenger);

    msg.launchExternalURL(aURL);
},

showOptFields: function() {
    /* Show regexp for rules only when enabled */
    document.getElementById('id-regex').hidden = !document.getElementById('id-showregexp').checked;
    /* Show reply settings only when enabled */
    let hide_reply_opts = !document.getElementById('id-reply-enable').checked
    document.getElementById('id-reply-options').hidden = hide_reply_opts;
}

} // fidOptions

window.addEventListener('load', function() {fidOptions.onLoad();}, false);
