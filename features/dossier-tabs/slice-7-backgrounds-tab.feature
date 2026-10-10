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

  Scenario: Havens, other traits and the notes card are shown
    Given a character with a Primary haven "The Orangery" described "A glassed-in greenhouse", located "Quai de la Tournelle", access "Back stair only", security "Two ghouls", a Secondary haven "Rue Mouffetard flat" on the Backgrounds tab
    When the Backgrounds tab is opened
    Then "The Orangery" shows its kind "Primary", description, location, access and security on the Backgrounds tab
    And "Rue Mouffetard flat" shows its kind "Secondary" on the Backgrounds tab

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
