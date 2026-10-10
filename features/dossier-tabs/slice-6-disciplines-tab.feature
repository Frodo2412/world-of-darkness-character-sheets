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

  Scenario: A Discipline rated 0 or unknown shows no powers
    Given a character with a Discipline named "Homebrewed" rated 2 and Dominate rated 0 on the Disciplines tab
    When the Disciplines tab is opened
    Then the "Owned" control reads "Owned · 1" on the Disciplines tab
    And "Homebrewed" shows its name and "2 / 5" and no powers on the Disciplines tab
    And Dominate is not listed on the Disciplines tab

  Scenario: A character with no Disciplines sees an empty state
    Given a character with no named Disciplines on the Disciplines tab
    When the Disciplines tab is opened
    Then "This character has no Disciplines." is shown with an "All disciplines" button on the Disciplines tab
    And the "Owned" control reads "Owned · 0" on the Disciplines tab

  Scenario: The Disciplines tab has nothing to edit
    Given a character in edit mode
    When the Disciplines tab is chosen from the tab bar on the Disciplines tab
    Then the sheet is still in edit mode on the Disciplines tab
    And nothing on the Disciplines tab can be edited
    And the tab says "Edit Discipline ratings on the Character sheet" on the Disciplines tab
    When the player follows its link on the Disciplines tab
    Then the Character sheet tab is shown on the Disciplines tab
