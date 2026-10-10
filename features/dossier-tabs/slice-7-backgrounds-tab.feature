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
