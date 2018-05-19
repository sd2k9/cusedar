function fidRules(debugEnable) {
    /* debugEnable: True when debug output is requested */
    this.init(debugEnable);
}

fidRules.prototype = {

init: function(debugEnable) {
    /* debugEnable: True when debug output is requested */

    this.bundle = Components.classes['@mozilla.org/intl/stringbundle;1'].
        getService(Components.interfaces.nsIStringBundleService).
        createBundle('chrome://fid/locale/rules.properties');
    this.mgr = Components.classes['@mozilla.org/messenger/account-manager;1'].
        getService(Components.interfaces.nsIMsgAccountManager)
    if (debugEnable) {
	/* Fetch debug console */
	this.console = (Components.utils.import("resource://gre/modules/Console.jsm", {})).console;
    } else {
	this.console = null; /* No Debug output */
    }

    this.load();
},

createRule: function() {
    let r = this.emptyRule();
    r.name = this.bundle.formatStringFromName('ruleName', [this.rules.length + 1], 1);
    this.rules.push(r);
    return r;
},

save: function() {
    let path = this.path();
    let json = JSON.stringify({data: this.rules});
    let stream = Components.classes['@mozilla.org/network/file-output-stream;1'].
        getService(Components.interfaces.nsIFileOutputStream);
    let cstream = Components.classes['@mozilla.org/intl/converter-output-stream;1'].
        createInstance(Components.interfaces.nsIConverterOutputStream);

    if (!path.exists())
        path.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0666);

    stream.init(path, 0x02 | 0x08 | 0x20, 0666, 0);
    cstream.init(stream, "UTF-8", 0, 0);
    cstream.writeString(json);
    cstream.close();
    stream.close();

    this.splitScope();
},

path: function() {
    let file = Components.classes['@mozilla.org/file/directory_service;1'].
        getService(Components.interfaces.nsIProperties).
        get("ProfD", Components.interfaces.nsIFile);

    file.append('flexible-dentity.json');
    return file;
},

emptyRule: function() {
    return {
        name: '',
        scope: '',
        account: '',
        noWarning: false,
        useRegex: false,
        skipCC: false,
        skipBCC: false,
    };
},

splitScope: function() {
    this.filters = [];

    for each (let r in this.rules) {
        let sp = r.useRegex ? r.scope.split(/[\r\n]+/) : r.scope.split(/[,;\s]+/);
        let res = [];

        for each(let s in sp) {
            if (r.useRegex) {
                try {
                    res.push(new RegExp(s));
                } catch (ex) {}
            } else
               res.push(s.toLocaleLowerCase());

        }

        this.filters.push(res);
    }
},

matchItem: function(aValue) {
    for (let n = 0, cnt = this.filters.length; n < cnt; ++n) {
        let r = this.rules[n];

        if (!r.account)
            continue;

        if (r.skipCC && aValue.type == 'addr_cc')
            continue;

        if (r.skipBCC && aValue.type == 'addr_bcc')
            continue;

        if (aValue.type == 'addr_reply')
            continue;

        let s = this.filters[n];

        if (r.useRegex) {
            for each (let f in s)
                if (!this.stEmpty(f) && f instanceof RegExp && aValue.email.match(f))
                    return n;
        } else {
            for each (let f in s)
                if (!this.stEmpty(f) && aValue.email.indexOf(f) != -1)
                    return n;
        }
    }

    return -1;
},

stEmpty: function(aValue) {
    return !aValue || /^\s*$/.test(aValue);
},

match: function(aValue) {
    /* Check stored rules, return index into rules array */
    for each (let cur in aValue) {
        let idx = this.matchItem(cur);

        if (idx != -1)
            return idx;
    }

    return -1;
},


matchAddrbook: function(aValue) {
 /* Try to find match for aValue in adress book
    Returns either the address found in Custom3, or null when no match */
 if (this.console) {
     this.console.log("DEBUG rules: addrbook checking addrbook for = ", aValue);
 }
 // First fetch a nsIAbCollection
 let abManager = Components.classes["@mozilla.org/abmanager;1"]
     .getService(Components.interfaces.nsIAbManager);
 let allAddressBooks = abManager.directories;
 let collection = null;
 let abfrom = null;   /* From fetched from adress book */
 while ( (abfrom == null) && allAddressBooks.hasMoreElements() ) {
     let addressBook = allAddressBooks.getNext()
         .QueryInterface(Components.interfaces.nsIAbDirectory);
     if (addressBook instanceof Components.interfaces.nsIAbCollection) {
	 collection = addressBook; // TODO: Could cache collections and re-use them
	 if (this.console) {
	     console.log("DEBUG rules: addrbook Directory Name = ", addressBook.dirName);
	 }
	 if (collection) {
	     // Then get the first card which matches this email address
	     /* Field names: https://dxr.mozilla.org/comm-central/source/mailnews/addrbook/public/nsIAbCard.idl */
	     for each (let cur in aValue) {
		 console.log("DEBUG rules: addrbook checking for ", cur.email);
		 let card = collection.cardForEmailAddress(cur.email);
		 if (card) {
		     abfrom = card.getProperty("Custom3", null);
		     if (this.console) {
			 console.log("DEBUG rules: addrbook card = ", card);
			 console.log("DEBUG rules: addrbook Custom 3 = ", abfrom);
		     }
		     break; /* Exit inner loop, out loop will be exited with abfrom != null */
		 }
	     }
	 }
     }
 }
 // abfrom contains the from adress, null when no match
 return abfrom;
},

fixRules: function() {
    for each (let r in this.rules) {
        let id = null;

        try {
            id = this.mgr.getIdentity(r.account);
        } catch (ex) {}

        if (!id || !id.email)
            r.account = '';
    }
},

load: function() {
    this.rules = [];

    let path = this.path();
    let json = '';

    if (path.exists()) {
        let stream = Components.classes['@mozilla.org/network/file-input-stream;1'].
            getService(Components.interfaces.nsIFileInputStream);
        let cstream = Components.classes['@mozilla.org/intl/converter-input-stream;1'].
            createInstance(Components.interfaces.nsIConverterInputStream);

        stream.init(path, 0x01 | 0x08, 0666, 0);
        cstream.init(stream, "UTF-8", 0, 0);

        let data = {};

        while (cstream.readString(-1, data) != 0)
            json += data.value;

        cstream.close();
        stream.close();
    }

    try {
        let obj = JSON.parse(json);

        if ('data' in obj)
            this.rules = obj.data;
    } catch (ex) {}

    this.fixRules();
    this.splitScope();
},

} // fidRules.prototype
