Thunderbird Extension Custom Sender Address and Reply
=====================================================


Overview
--------
The Thunderbird extension _Custom Sender Address and Reply_
(_Cusedar_ for short) is a merge of
Flexible Identity
and
Reply as Original Recipient
with new features added.

Cusedar allows the user to define custom "From"-addresses based
on the recipient mail address. Either by defining rules in the extension
options, or in the address book.  
In addition, when replying to a mail the extension can check the "To"-address
of the received mail and with a regular expression match this
address is used as the new "From"-address. Thus ensuring you always reply with
the correct identiy.

Features
- Custom "From"-address based on rules
- Custom "From"-address based on address book lookup ("Custom 3" entry)  
  Supported Formats: "mail@domain.ext", "sendername <mail@domain.ext>"
- For replies use "To"-address as "From"-address, based on regular expression match


Local installation
------------------
For a local installation create a file named  
your_thunderbird_profile/extensions/cusedar@sethdepot.org  
with it's only content being the path where you downloaded or cloned
this extension.  
Please take care that currently the settings (and other stuff)
still share their names with Flexible Identity, so expect trouble when you
have both extensions installed.


License and Origin
------------------
The original source code files are licensed under different
licenses
- Flexible Identity version 1.0.4: GNU General Public License, version 3.0
  - License text: LICENSE-gpl-3.0.md
  - Imported with commit ff698df03c231f80c3f505aedafde49a78c6aeb3
  - Thunderbird Plugin page:
    https://addons.mozilla.org/en-US/thunderbird/addon/flexible-identity/
  - Filename: flexible_identity-1.0.4-sm+tb.xpi
- Reply as Original Recipient version 1.0: Mozilla Public License, version 2.0
  - License text: LICENSE-mpl-2.0.txt
  - Imported with commit 71902534890f1add9646027c2a714cafd840aa89
  - Homepage: http://blog.qiqitori.com/?p=194
  - Thunderbird Plugin page:
    https://addons.mozilla.org/en-US/thunderbird/addon/reply-as-original-recipient/
  - Filename: reply_as_original_recipient-1.0-tb.xpi

All changes afterwards are dual-licensed under both
GNU General Public License version 3.0 and
Mozilla Public License version 2.0 .

Author
------
- Flexible Identity  
  Paul Kolomiets
- Reply as Original Recipient  
  Qiqitori
- Custom Sender Address and Reply  
  Copyright (C) 2017-2018 Robert Lange (sd2k9@sethdepot.org)

If you have any questions, just write me or create an issue (see below).



Web Links
---------
- Repository  
  https://github.com/sd2k9/cusedar
- Issue tracker  
  https://github.com/sd2k9/cusedar/issues
