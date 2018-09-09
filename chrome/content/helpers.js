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

var fidHelpers = {

onLoad: function() {
    try {
        let prefs = Components.classes['@mozilla.org/preferences-service;1'].
            getService(Components.interfaces.nsIPrefBranch);

        this.pref = 'extensions.fid.welcome.version';
        this.version = 1;

        if (this.willShowNotify(prefs)) {
            this.showNotify();
            this.resetNotifyPref(prefs);
        }
    } catch (ex) {Components.utils.reportError(ex);}
},

willShowNotify: function(prefs) {
    try {
        return prefs.getIntPref(this.pref) < this.version;
    } catch (ex) { /* nothing */ }

    return true;
},

resetNotifyPref: function(prefs) {
    prefs.setIntPref(this.pref, this.version);
},

showNotify: function() {
    let notifyBox = document.getElementById('mail-notification-box');

    let bundle = Components.classes['@mozilla.org/intl/stringbundle;1'].
        getService(Components.interfaces.nsIStringBundleService).
        createBundle('chrome://fid/locale/rules.properties');

    let notifyText = bundle.GetStringFromName('fidWelcome');

    var buttons = [
        {
            label: bundle.GetStringFromName('fidWelcomeAction'),
            accessKey: null,
            popup: null,
            callback: function(aNotificationBar, aButton) {
                window.open('chrome://fid/content/options.xul', '', 'chrome,centerscreen,modal,resizable');
                return true;
            }
        }
    ];

    var box = notifyBox.appendNotification(notifyText, "about-fid",
        null, notifyBox.PRIORITY_INFO_LOW, buttons);

    box.persistence = 4;
},

} // fidHelpers

window.addEventListener('load', function() {fidHelpers.onLoad();}, false);
