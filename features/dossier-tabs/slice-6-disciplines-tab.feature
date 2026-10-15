Feature: Disciplines tab

  Scenario: The tab lists the character's Disciplines with what they unlock
    Given a character with Presence 3, Auspex 2 and Celerity 1
    When the Disciplines tab is opened
    Then Presence shows "3 / 5" and "3 levels unlocked" on the Disciplines tab
    And Auspex shows "2 levels unlocked" and Celerity "1 level unlocked" on the Disciplines tab

  Scenario: Powers are Known up to the rating and Locked above it, in level order
    Given a character with Presence 3
    When Presence is selected on the Disciplines tab
    Then the powers are listed Awe, Dread Gaze, Entrancement, Summon, Majesty on the Disciplines tab
    And Awe, Dread Gaze and Entrancement are Known on the Disciplines tab
    And Summon is Locked with "Requires Presence 4" on the Disciplines tab
    And Majesty is Locked with "Requires Presence 5" on the Disciplines tab

  Scenario: An expanded power shows its rules and the character's pool
    Given a character with Presence 3, Charisma 3, Performance 3 and a Hurt wound
    When the Awe power is expanded on the Disciplines tab
    Then it shows activation cost "1 blood point", prerequisite "Presence 1" and difficulty "7" on the Disciplines tab
    And it shows its dice pool "Charisma + Performance" and its page "V20 p. 193" on the Disciplines tab
    And it shows "Your pool: 5 dice" with "Charisma 3 + Performance 3 − wound 1" on the Disciplines tab

  Scenario: A field the book does not state cleanly points to the rulebook
    Given a character with Presence 3
    When the Dread Gaze power is expanded on the Disciplines tab
    Then it shows duration "See rulebook (V20 p. 194)" on the Disciplines tab

  Scenario: A heavy wound floors the pool at zero
    Given a character with Presence 1, Charisma 1, Performance 0 and a Crippled wound
    When the Awe power is expanded on the Disciplines tab
    Then it shows "Your pool: 0 dice" with "Charisma 1 + Performance 0 − wound 5" on the Disciplines tab

  Scenario: An incapacitated character has no pool
    Given a character who is Incapacitated with Presence 1
    When the Awe power is expanded on the Disciplines tab
    Then it shows "Your pool: 0 dice" and says the character is incapacitated on the Disciplines tab

  Scenario: A Locked power shows its rules but no pool
    Given a character with Presence 3
    When the Summon power is expanded on the Disciplines tab
    Then it shows "Locked — requires Presence 4" on the Disciplines tab
    And it has no pool and no "Build pool" button on the Disciplines tab

  Scenario: A power that uses no roll says what it uses instead
    Given a character with Auspex 1
    When the Heightened Senses power is expanded on the Disciplines tab
    Then it states what it uses instead of a roll, "No roll", on the Disciplines tab
    And it has no pool and no "Build pool" button on the Disciplines tab

  Scenario: A Discipline with no listed powers shows its note
    Given a character with Celerity 1
    When Celerity is selected on the Disciplines tab
    Then the Discipline's note is shown and no powers are listed on the Disciplines tab

  Scenario: A power opens and closes from the keyboard
    Given a character with Presence 3
    When the player focuses the Awe heading on the Disciplines tab and presses Enter, then Space
    Then its panel is shown and open, then hidden and closed, on the Disciplines tab

  Scenario: Search matches a power's name or its summary
    Given a character with Presence 3 and Auspex 2
    When the player searches "dread" on the Disciplines tab
    Then Dread Gaze remains under Presence on the Disciplines tab
    When the player searches "receptive" on the Disciplines tab
    Then Awe remains and Dread Gaze does not on the Disciplines tab
    When the player searches "zzzz" on the Disciplines tab
    Then an empty-state message is shown on the Disciplines tab

  Scenario: Owned and All disciplines switch the list
    Given a character with Presence 3, Auspex 2 and Celerity 1
    When the Disciplines tab is opened
    Then the "Owned" control reads "Owned · 3" on the Disciplines tab
    When the player chooses "All disciplines" on the Disciplines tab
    Then all seventeen catalogued Disciplines are listed on the Disciplines tab
    And a Discipline the character lacks shows every power Locked on the Disciplines tab
    When the player chooses "Owned" on the Disciplines tab
    Then the three Disciplines are listed on the Disciplines tab

  Scenario: Build pool selects the power's traits on the Character sheet
    Given a character with Presence 1, Charisma 3 and Performance 2 viewing the Awe power on the Disciplines tab
    When the player presses "Build pool" on the Disciplines tab
    Then the Character sheet tab is shown
    And its Selected pool holds Charisma and Performance
    And "Pool set to Charisma + Performance" is announced

  Scenario: A Discipline rated 0 or unknown shows no powers
    Given a character with a Discipline named "Homebrewed" rated 2 and Dominate rated 0
    When the Disciplines tab is opened
    Then "Homebrewed" shows its name and rating and no powers on the Disciplines tab
    And Dominate shows its name and rating and no powers on the Disciplines tab

  Scenario: A character with no Disciplines sees an empty state
    Given a character with no named Disciplines
    When the Disciplines tab is opened
    Then a message says the character has none and offers "Browse all disciplines" on the Disciplines tab

  Scenario: The Disciplines tab has nothing to edit
    Given a character in edit mode
    When the Disciplines tab is opened
    Then nothing on the tab can be edited
    And the tab says to edit Discipline ratings on the Character sheet

  Scenario: The Disciplines tab is accessible and fits a phone
    Given a character with Presence 3 and the Awe power expanded on the Disciplines tab
    When the Disciplines tab is scanned for accessibility problems
    Then no problems are reported
    When the Disciplines tab is opened at 320 pixels wide with crowded content
    Then the page does not scroll sideways
