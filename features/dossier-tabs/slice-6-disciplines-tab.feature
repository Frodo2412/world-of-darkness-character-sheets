Feature: Disciplines tab

  Scenario: The tab lists the character's Disciplines with what they unlock
    Given a character with Presence 3, Auspex 2 and Celerity 1 on the Disciplines tab
    When the Disciplines tab is opened
    Then Presence shows "3 / 5" and "3 levels unlocked" on the Disciplines tab
    And Auspex shows "2 levels unlocked" on the Disciplines tab
    And Celerity shows "1 level unlocked" although the catalogue lists no Celerity powers on the Disciplines tab
    And the character's name, the mode toggle, the save status and the resources row are shown

  Scenario: Powers are Known up to the rating and Locked above it, in level order
    Given a character with Presence 3 on the Disciplines tab
    When Presence is selected on the Disciplines tab
    Then the powers are listed Awe, Dread Gaze, Entrancement, Summon, Majesty on the Disciplines tab
    And Awe, Dread Gaze and Entrancement are Known on the Disciplines tab
    And Summon is Locked with "Requires Presence 4" on the Disciplines tab
    And Majesty is Locked with "Requires Presence 5" on the Disciplines tab

  Scenario: An expanded power shows its rules and the character's pool
    Given a character with Presence 1, Charisma 3, Performance 3 and a Hurt wound (1 die off every pool) on the Disciplines tab
    When the Awe power is expanded on the Disciplines tab
    Then it shows activation cost "1 blood point" on the Disciplines tab
    And it shows duration "Remainder of the scene or until the character chooses to drop it" on the Disciplines tab
    And it shows prerequisite "Presence 1" and difficulty "7" on the Disciplines tab
    And it shows its dice pool "Charisma + Performance" and its book reference "V20 p. 193" on the Disciplines tab
    And it shows "Your pool: 5 dice" with "Charisma 3 + Performance 3 − wound 1" on the Disciplines tab

  Scenario: A heavy wound floors the pool at zero
    Given a character with Presence 1, Charisma 1, Performance 0 and a Crippled wound (5 dice off every pool) on the Disciplines tab
    When the Awe power is expanded on the Disciplines tab
    Then it shows "Your pool: 0 dice" with "Charisma 1 + Performance 0 − wound 5" on the Disciplines tab
    And "Incapacitated: every pool is 0 dice." is not shown on the Disciplines tab

  Scenario: An incapacitated character has no pool
    Given a character with Presence 1, Charisma 3, Performance 3 and the health track fully marked Incapacitated on the Disciplines tab
    When the Awe power is expanded on the Disciplines tab
    Then it shows "Your pool: 0 dice" on the Disciplines tab
    And it shows "Incapacitated: every pool is 0 dice." on the Disciplines tab

  Scenario: A Locked power shows its rules but no pool
    Given a character with Presence 3 on the Disciplines tab
    When the Summon power is expanded on the Disciplines tab
    Then it shows "Locked — requires Presence 4" on the Disciplines tab
    And it shows activation cost "1 blood point", duration "Until dawn" and its book reference "V20 p. 195" on the Disciplines tab
    And it shows difficulty "5 base; 7 if met only briefly; 4 after an earlier success; 8 after an earlier failure" on the Disciplines tab
    And it has no pool and no "Build pool" button on the Disciplines tab

  Scenario: A power that uses no roll says what it uses instead
    Given a character with Protean 1 on the Disciplines tab
    When the Eyes of the Beast power is expanded on the Disciplines tab
    Then what it uses instead of a roll is shown as "No roll" on the Disciplines tab
    And it has no "Your pool" line and no "Build pool" button on the Disciplines tab
    And it shows activation cost "None" and prerequisite "Protean 1" on the Disciplines tab
    And its duration reads "See rulebook (V20 p. 199)" on the Disciplines tab
    And its difficulty reads "See rulebook (V20 p. 199)" on the Disciplines tab

  Scenario: A power opens and closes from the keyboard
    Given a character with Presence 3 on the Disciplines tab
    When the player focuses the Awe heading on the Disciplines tab and presses Enter, then Space
    Then its panel is shown and its state is "expanded", then hidden and "collapsed" on the Disciplines tab

  Scenario: Search matches a power's name or its summary
    Given a character with Presence 3 and Auspex 2 on the Disciplines tab
    When the player searches "dread" on the Disciplines tab
    Then Dread Gaze remains under Presence on the Disciplines tab
    When the player searches "receptive" on the Disciplines tab
    Then Awe remains and Dread Gaze does not on the Disciplines tab
    When the player searches "zzzz" on the Disciplines tab
    Then "No Disciplines or powers match." is shown on the Disciplines tab

  Scenario: Owned and All disciplines switch the list
    Given a character with Presence 3, Auspex 2 and Celerity 1 on the Disciplines tab
    When the Disciplines tab is opened
    Then the "Owned" control reads "Owned · 3" on the Disciplines tab
    When the player chooses "All disciplines" on the Disciplines tab
    Then exactly seventeen Disciplines are listed on the Disciplines tab
    And Animalism, which the character lacks, shows its five powers all Locked, the first as "Requires Animalism 1" on the Disciplines tab
    When the player chooses "Owned" again on the Disciplines tab
    Then only Presence, Auspex and Celerity are listed on the Disciplines tab

  Scenario: Build pool selects the power's traits on the Character sheet
    Given a character with Presence 1, Charisma 3 and Performance 3 on the Disciplines tab
    And the Awe power is expanded on the Disciplines tab
    When the player presses "Build pool" on the Disciplines tab
    Then the Character sheet tab is shown
    And its Selected pool holds Charisma and Performance on the Disciplines tab
    And "Pool set to Charisma + Performance" is announced on the Disciplines tab
    And focus is on the Selected pool heading on the Disciplines tab

  Scenario: A Discipline rated 0 or unknown shows no powers
    Given a character with a Discipline named "Homebrewed" rated 2 and Dominate rated 0 on the Disciplines tab
    When the Disciplines tab is opened
    Then the "Owned" control reads "Owned · 1" on the Disciplines tab
    And "Homebrewed" shows its name and "2 / 5" and no powers on the Disciplines tab
    And Dominate is not listed on the Disciplines tab
    When the player chooses "All disciplines" on the Disciplines tab
    Then "Dominate" shows its name and "0 / 5" and no powers on the Disciplines tab

  Scenario: A character with no Disciplines sees an empty state
    Given a character with no named Disciplines on the Disciplines tab
    When the Disciplines tab is opened
    Then "This character has no Disciplines." is shown with an "All disciplines" button on the Disciplines tab
    And the "Owned" control reads "Owned · 0" on the Disciplines tab
    When the player presses "All disciplines" in the empty state on the Disciplines tab
    Then exactly seventeen Disciplines are listed on the Disciplines tab

  Scenario: The Disciplines tab has nothing to edit
    Given a character in edit mode
    When the Disciplines tab is chosen from the tab bar on the Disciplines tab
    Then the sheet is still in edit mode on the Disciplines tab
    And nothing on the Disciplines tab can be edited
    And the tab says "Edit Discipline ratings on the Character sheet" on the Disciplines tab
    When the player follows its link on the Disciplines tab
    Then the Character sheet tab is shown on the Disciplines tab

  Scenario: The Disciplines tab is accessible and fits a phone
    Given a character with Presence 3 and a Discipline named "SupercalifragilisticexpialidociousSupercalifragilisticexpialidocious" rated 5 on the Disciplines tab
    And the Awe power is expanded on the Disciplines tab
    And the "All disciplines" view is chosen on the Disciplines tab
    When the Disciplines tab is scanned for accessibility problems
    Then no problems are reported
    When the player searches "zzzz" on the Disciplines tab
    And the Disciplines tab is scanned for accessibility problems
    Then no problems are reported
    When the Disciplines tab is opened at 320 pixels wide with crowded content
    And the Awe power is expanded on the Disciplines tab
    And the "All disciplines" view is chosen on the Disciplines tab
    Then the page does not scroll sideways
