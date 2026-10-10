Feature: Backgrounds tab

  Scenario: Backgrounds show their name, dots, summary, note and people
    Given a character with Allies 2 summarised "Camille Arnaud · museum curator", noted "Owes a favour", with the people "Camille Arnaud" (museum curator) and "Lucien Voss" (dockside fixer) on the Backgrounds tab
    When the Backgrounds tab is opened
    Then Allies shows 2 of 5 dots, the summary "Camille Arnaud · museum curator" and the note "Owes a favour" on the Backgrounds tab
    And Allies shows both people with their roles on the Backgrounds tab
    And the character's name, the mode toggle, the save status and the resources row are shown

  Scenario: Unnamed background rows are hidden in play
    Given a character with two named backgrounds and four blank rows on the Backgrounds tab
    When the Backgrounds tab is opened
    Then two background cards are shown on the Backgrounds tab
    And the section index reads "Expanded backgrounds · 2" on the Backgrounds tab

  Scenario: Merits and Flaws show points and totals
    Given a character with a merit "Acute Sense" (Physical, 1 point), a merit "Eidetic Memory" (Mental, 2 points) and a flaw "Hunted" (Social, 1 point) on the Backgrounds tab
    When the Backgrounds tab is opened
    Then the Merits heading reads "2 entries · 3 points" on the Backgrounds tab
    And the Flaws heading reads "1 entry · 1 point" on the Backgrounds tab
    And the merits show "1 pt" and "2 pts" and each entry shows its category on the Backgrounds tab

  Scenario: Havens, other traits and the notes card are shown
    Given a character with a Primary haven "The Orangery" described "A glassed-in greenhouse", located "Quai de la Tournelle", access "Back stair only", security "Two ghouls", a Secondary haven "Rue Mouffetard flat" and an unrated other trait "Languages" of kind "Skill" noted "French · native" on the Backgrounds tab
    When the Backgrounds tab is opened
    Then "The Orangery" shows its kind "Primary", description, location, access and security on the Backgrounds tab
    And "Rue Mouffetard flat" shows its kind "Secondary" on the Backgrounds tab
    And "Languages" shows its kind "Skill" and its note "French · native" without dots on the Backgrounds tab
    And the note "Character notes, not rule effects" is shown on the Backgrounds tab

  Scenario: Play mode is read-only
    Given a character in play mode with backgrounds on the Backgrounds tab
    When the Backgrounds tab is chosen from the tab bar on the Backgrounds tab
    Then nothing on the tab can be edited
    And the read-only hint is shown

  Scenario: Empty sections say they are empty
    Given a character with no backgrounds, havens, merits, flaws or other traits on the Backgrounds tab
    When the Backgrounds tab is opened
    Then the Backgrounds section shows "No backgrounds yet." on the Backgrounds tab
    And the Havens section shows "No havens yet." on the Backgrounds tab
    And the Merits section shows "No merits yet." on the Backgrounds tab
    And the Flaws section shows "No flaws yet." on the Backgrounds tab
    And the Other traits section shows "No other traits yet." on the Backgrounds tab
    And every count in the section index reads 0 on the Backgrounds tab
    When the player switches to edit mode on the Backgrounds tab
    Then the Havens, Merits, Flaws and Other traits sections show the same messages with an Add control on the Backgrounds tab
    And the Backgrounds section shows six empty rows on the Backgrounds tab

  Scenario: Section counts match the lists in play mode
    Given a character with five named backgrounds, two havens, two merits, one flaw and three other traits on the Backgrounds tab
    When the Backgrounds tab is opened
    Then the section index reads "Expanded backgrounds · 5", "Havens · 2", "Merits · 2", "Flaws · 1" and "Other Traits · 3" on the Backgrounds tab

  Scenario: Section counts in edit mode include blank rows
    Given a character in edit mode with five named backgrounds and a haven with no name on the Backgrounds tab
    When the Backgrounds tab is chosen from the tab bar on the Backgrounds tab
    Then the section index reads "Expanded backgrounds · 6" and "Havens · 1" on the Backgrounds tab
    When the player switches to play mode on the Backgrounds tab
    Then the section index reads "Expanded backgrounds · 5" and "Havens · 0" on the Backgrounds tab

  Scenario: Edit mode shows every row and offers to add more
    Given a character in edit mode with two named backgrounds and four blank rows on the Backgrounds tab
    When the Backgrounds tab is chosen from the tab bar on the Backgrounds tab
    Then six background rows are shown, four of them empty on the Backgrounds tab
    And an "Add background" control is shown on the Backgrounds tab
    And the section index reads "Expanded backgrounds · 6" on the Backgrounds tab

  Scenario: A row with details but no name is flagged in edit mode
    Given a character in edit mode with a background row holding a note but no name on the Backgrounds tab
    When the Backgrounds tab is chosen from the tab bar on the Backgrounds tab
    Then that row says "Name needed to show in play mode" on the Backgrounds tab
    When the player switches to play mode on the Backgrounds tab
    Then that row is not shown on the Backgrounds tab

  Scenario: Edit mode adds a merit and the counts follow
    Given a character in edit mode with one merit "Acute Sense" of 1 point on the Backgrounds tab
    When the player adds the merit "Eidetic Memory" of 2 points on the Backgrounds tab
    Then the Merits heading reads "2 entries · 3 points" on the Backgrounds tab
    And the section index reads "Merits · 2" on the Backgrounds tab
    And the Merits heading and the section index are the same after a reload on the Backgrounds tab

  Scenario Outline: Edit mode adds an entry to each other section and the counts follow
    Given a character in edit mode with one named entry in "<section>" on the Backgrounds tab
    When the player adds the entry "<name>" to "<section>" on the Backgrounds tab
    Then "<section>" lists two entries on the Backgrounds tab
    And the section index reads "<index>" on the Backgrounds tab
    And "<section>" lists the same two entries and the index reads "<index>" after a reload on the Backgrounds tab

    Examples:
      | section      | name         | index            |
      | Havens       | The Orangery | Havens · 2       |
      | Flaws        | Hunted       | Flaws · 2        |
      | Other traits | Languages    | Other Traits · 2 |

  Scenario: A seventh background can be added
    Given a character in edit mode with six named backgrounds on the Backgrounds tab
    When the player adds the background "Domain" on the Backgrounds tab
    Then seven background rows are shown on the Backgrounds tab
    And the section index reads "Expanded backgrounds · 7" on the Backgrounds tab
    And seven rows, "Domain" among them, and the index are the same after a reload on the Backgrounds tab

  Scenario: Removing a flaw can be undone
    Given a character in edit mode with one flaw "Hunted" of 1 point on the Backgrounds tab
    When the player removes the flaw on the Backgrounds tab
    Then the Flaws section shows "No flaws yet." on the Backgrounds tab
    And the section index reads "Flaws · 0" on the Backgrounds tab
    And "Removed Hunted. Undo" is announced and focus is on the Undo button on the Backgrounds tab
    When the player presses Undo on the Backgrounds tab
    Then the flaw "Hunted" is back with its category, 1 point and note, and focus is on it on the Backgrounds tab
    And the section index reads "Flaws · 1" and it is the same after a reload on the Backgrounds tab

  Scenario Outline: Removing an entry from each other section can be undone
    Given a character in edit mode with one <family> "<name>" with every field filled on the Backgrounds tab
    When the player removes it on the Backgrounds tab
    Then the section shows "<empty>" on the Backgrounds tab
    And "Removed <name>. Undo" is announced and focus is on the Undo button on the Backgrounds tab
    When the player presses Undo on the Backgrounds tab
    Then the entry is back with every field and focus is on it on the Backgrounds tab
    And the section index reads "<index>" and it is the same after a reload on the Backgrounds tab

    Examples:
      | family      | name           | empty                | index            |
      | haven       | The Orangery   | No havens yet.       | Havens · 1       |
      | merit       | Eidetic Memory | No merits yet.       | Merits · 1       |
      | other trait | Languages      | No other traits yet. | Other Traits · 1 |

  Scenario: Removing a background blanks its row and Undo restores every field
    Given a character in edit mode with six named backgrounds, the second being Contacts 3 summarised "Port authority", noted "Knows the night shift", with one person "Odile" (clerk) on the Backgrounds tab
    When the player removes "Contacts" on the Backgrounds tab
    Then the second row is blank: no name, rating 0, no summary, no note and no people on the Backgrounds tab
    And six background rows are shown on the Backgrounds tab
    And "Removed Contacts. Undo" is announced and focus is on the Undo button on the Backgrounds tab
    When the player switches to play mode on the Backgrounds tab
    Then five background cards are shown and none of them is "Contacts" on the Backgrounds tab
    When the player switches to edit mode on the Backgrounds tab
    And the player presses Undo on the Backgrounds tab
    Then the second row holds "Contacts", rating 3, the summary, the note and the person "Odile" (clerk) again on the Backgrounds tab
    And focus is on that row on the Backgrounds tab
    And six rows are stored before and after a reload on the Backgrounds tab

  Scenario: A background past the sixth is removed outright
    Given a character in edit mode with seven named backgrounds on the Backgrounds tab
    When the player removes the seventh on the Backgrounds tab
    Then six background rows are shown on the Backgrounds tab
    And the section index reads "Expanded backgrounds · 6" on the Backgrounds tab
    When the player presses Undo on the Backgrounds tab
    Then seven background rows are shown on the Backgrounds tab
    And the seventh is as it was on the Backgrounds tab

  Scenario Outline: A negative point value is corrected with a message
    Given a character in edit mode with a <family> of 2 points on the Backgrounds tab
    When the player enters -3 points on the Backgrounds tab
    Then the points show 0 and "Points kept at 0 or more." is shown on the Backgrounds tab
    And the points are still 0 after a reload on the Backgrounds tab

    Examples:
      | family |
      | merit  |
      | flaw   |

  Scenario: A rating outside 0 to 10 is corrected with a message
    Given a character in edit mode with the background Allies 2 on the Backgrounds tab
    When the player sets Allies to 14 on the Backgrounds tab
    Then Allies shows its rating as 10 and "Rating kept between 0 and 10." is shown on the Backgrounds tab

  Scenario: An edited field survives a reload
    Given a character in edit mode with the background Allies 2 on the Backgrounds tab
    When the player sets Allies to 4 and its summary to "Camille's circle" on the Backgrounds tab
    And the sheet is reloaded on the Backgrounds tab
    Then Allies shows 4 of 5 dots and the summary "Camille's circle" on the Backgrounds tab

  Scenario: A person can be added to a background and taken off again
    Given a character in edit mode with the background Allies 2 on the Backgrounds tab
    When the player adds the person "Odile" (clerk) to Allies on the Backgrounds tab
    And the sheet is reloaded on the Backgrounds tab
    Then Allies shows the person "Odile" (clerk) on the Backgrounds tab
    When the player switches to edit mode on the Backgrounds tab
    And the player takes the person "Odile" off Allies on the Backgrounds tab
    And the sheet is reloaded on the Backgrounds tab
    Then Allies shows no people on the Backgrounds tab

  Scenario: The Backgrounds tab is accessible and fits a phone
    Given a character in edit mode with eight backgrounds, two havens, two merits, one flaw and three other traits, all with very long names on the Backgrounds tab
    When the Backgrounds tab is scanned for accessibility problems
    Then no problems are reported
    When the Backgrounds tab is opened at 320 pixels wide with crowded content
    Then the page does not scroll sideways
    When the player switches to edit mode on the Backgrounds tab
    Then the page does not scroll sideways
