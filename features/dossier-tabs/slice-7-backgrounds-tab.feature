Feature: Backgrounds tab

  Scenario: Backgrounds show their name, dots, summary, note and people
    Given a character with Allies 2 summarised "Camille Arnaud · museum curator" and two named allies
    When the Backgrounds tab is opened
    Then Allies shows 2 of 5 dots, its summary, its note and both people with their roles

  Scenario: Unnamed background rows are hidden in play
    Given a character with two named backgrounds and four blank rows
    When the Backgrounds tab is opened
    Then two background cards are shown

  Scenario: Edit mode shows every row and offers to add more
    Given a character in edit mode with two named backgrounds and four blank rows
    When the Backgrounds tab is opened
    Then six background rows are shown, four of them empty
    And an "Add background" control is shown

  Scenario: A row with details but no name is flagged in edit mode
    Given a character in edit mode with a background row holding a note but no name
    When the Backgrounds tab is opened
    Then that row says "Name needed to show in play mode"

  Scenario: Merits and Flaws show points and totals
    Given a character with merits of 1 and 2 points and a flaw of 1 point
    When the Backgrounds tab is opened
    Then the Merits heading reads "2 entries · 3 points" and the Flaws heading "1 entry · 1 point"
    And the merits show "1 pt" and "2 pts" and each entry shows its category

  Scenario: Havens, other traits and the notes card are shown
    Given a character with a Primary haven and a Secondary haven and an unrated trait "Languages" noted "French · native"
    When the Backgrounds tab is opened
    Then each haven shows its kind, name, description, location, access and security
    And "Languages" shows its kind and note without dots
    And the note "Character notes, not rule effects" is shown

  Scenario: Play mode is read-only
    Given a character in play mode with backgrounds
    When the Backgrounds tab is opened
    Then nothing on the tab can be edited
    And the read-only hint is shown

  Scenario: Edit mode adds a merit and the counts follow
    Given a character in edit mode with one merit of 1 point
    When the player adds the merit "Eidetic Memory" of 2 points on the Backgrounds tab
    Then the Merits heading reads "2 entries · 3 points"
    And the section index reads "Merits · 2"
    And it is the same after a reload

  Scenario: Removing an entry can be undone
    Given a character in edit mode with one flaw of 1 point
    When the player removes the flaw on the Backgrounds tab
    Then the Flaws section shows its empty state
    And "Removed Dark Secret. Undo" is announced
    When the player presses Undo on the Backgrounds tab
    Then the flaw is back with its 1 point and focus is on it

  Scenario: A seventh background can be added
    Given a character in edit mode with six named backgrounds
    When the player adds the background "Domain" on the Backgrounds tab
    Then seven background rows are shown and it survives a reload

  Scenario: A negative point value is corrected with a message
    Given a character in edit mode on the Backgrounds tab with a merit
    When the player enters -3 points on the Backgrounds tab
    Then the points show 0 and "Points kept at 0 or more." is shown

  Scenario: Empty sections say they are empty
    Given a character with no backgrounds, havens, merits, flaws or other traits
    When the Backgrounds tab is opened
    Then each section shows an empty-state message

  Scenario: Section counts match the lists
    Given a character with five backgrounds, two havens, two merits, one flaw and three other traits
    When the Backgrounds tab is opened
    Then the section index reads "Expanded backgrounds · 5", "Havens · 2", "Merits · 2", "Flaws · 1" and "Other Traits · 3"

  Scenario: The Backgrounds tab is accessible and fits a phone
    Given a character in edit mode with eight backgrounds
    When the Backgrounds tab is scanned for accessibility problems
    Then no problems are reported
    When the Backgrounds tab is opened at 320 pixels wide with crowded content
    Then the page does not scroll sideways
